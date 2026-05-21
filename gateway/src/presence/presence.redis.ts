import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PresenceState } from './presence.types';

type PresenceFlags = {
  matching: boolean;
  inGame: boolean;
};

@Injectable()
export class PresenceRedis implements OnModuleDestroy {
  private readonly host: string;
  private readonly port: number;
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly kv: Redis;

  constructor(private readonly configService: ConfigService) {
    this.host = this.configService.get<string>('REDIS_HOST') ?? 'redis';
    this.port = Number(this.configService.get<string>('REDIS_PORT') ?? 6379);
    this.pub = new Redis({ host: this.host, port: this.port });
    this.sub = new Redis({ host: this.host, port: this.port });
    this.kv = new Redis({ host: this.host, port: this.port });
  }

  getPublisher() {
    return this.pub;
  }

  getSubscriber() {
    return this.sub;
  }

  createSubscriber() {
    return new Redis({ host: this.host, port: this.port });
  }

  async getConnectionCount(userId: string): Promise<number> {
    const raw = await this.kv.get(this.connKey(userId));
    return Number(raw ?? 0);
  }

  async incrementConnection(userId: string): Promise<number> {
    return this.kv.incr(this.connKey(userId));
  }

  async decrementConnection(userId: string): Promise<number> {
    const key = this.connKey(userId);
    const count = await this.kv.decr(key);
    if (count <= 0) {
      await this.kv.set(key, '0');
      return 0;
    }
    return count;
  }

  async getEffectiveState(userId: string): Promise<PresenceState> {
    const raw = await this.kv.get(this.effectiveKey(userId));
    if (raw === 'ONLINE' || raw === 'MATCHING' || raw === 'IN_GAME') {
      return raw;
    }
    return 'OFFLINE';
  }

  async setEffectiveState(userId: string, state: PresenceState): Promise<void> {
    await Promise.all([
      this.kv.set(this.effectiveKey(userId), state),
      this.kv.set(this.lastSeenKey(userId), new Date().toISOString()),
    ]);
  }

  async getFlags(userId: string): Promise<PresenceFlags> {
    const raw = await this.kv.get(this.flagsKey(userId));
    if (!raw) return { matching: false, inGame: false };
    try {
      const parsed = JSON.parse(raw) as PresenceFlags;
      return {
        matching: Boolean(parsed.matching),
        inGame: Boolean(parsed.inGame),
      };
    } catch {
      return { matching: false, inGame: false };
    }
  }

  async setFlags(userId: string, flags: PresenceFlags): Promise<void> {
    await this.kv.set(this.flagsKey(userId), JSON.stringify(flags));
  }

  // daeunki2수정 : 수정이유
  // seq는 source별 단조 증가 값이라 user 단일 키로 비교하면 다른 source 이벤트와 충돌한다.
  // source + userId 조합으로 분리 저장해야 stale 판정이 정확해진다.
  async getLastSequence(source: string, userId: string): Promise<number> {
    const raw = await this.kv.get(this.lastSeqKey(source, userId));
    return Number(raw ?? 0);
  }

  // daeunki2수정 : 수정이유
  // source별 최신 seq 저장
  async setLastSequence(source: string, userId: string, seq: number): Promise<void> {
    await this.kv.set(this.lastSeqKey(source, userId), String(seq));
  }

  // daeunki2수정 : 수정이유
  // at 타임스탬프도 source별로 분리해 동일 seq 동률 시 비교 정확도를 맞춘다.
  async getLastEventAt(source: string, userId: string): Promise<number> {
    const raw = await this.kv.get(this.lastEventAtKey(source, userId));
    if (!raw) return 0;
    const time = Date.parse(raw);
    return Number.isNaN(time) ? 0 : time;
  }

  // daeunki2수정 : 수정이유
  // source별 최신 at 저장
  async setLastEventAt(source: string, userId: string, at: string): Promise<void> {
    await this.kv.set(this.lastEventAtKey(source, userId), at);
  }

  async markEventProcessed(eventId: string, ttlSec = 120): Promise<boolean> {
    const result = await this.kv.set(this.eventDedupKey(eventId), '1', 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  async touchAlive(userId: string, ttlSec: number): Promise<void> {
    await this.kv.set(this.aliveKey(userId), '1', 'EX', ttlSec);
  }

  async clearAlive(userId: string): Promise<void> {
    await this.kv.del(this.aliveKey(userId));
  }

  async isAlive(userId: string): Promise<boolean> {
    const exists = await this.kv.exists(this.aliveKey(userId));
    return exists === 1;
  }

  async setConnectionCount(userId: string, count: number): Promise<void> {
    const normalized = count > 0 ? count : 0;
    await this.kv.set(this.connKey(userId), String(normalized));
  }

  async getUsersWithConnections(): Promise<string[]> {
    const users: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.kv.scan(cursor, 'MATCH', 'presence:conn:*', 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        const userId = key.slice('presence:conn:'.length);
        if (!userId) continue;
        const count = Number((await this.kv.get(key)) ?? 0);
        if (count > 0) {
          users.push(userId);
        }
      }
    } while (cursor !== '0');
    return users;
  }

  async getFriendIdsCache(userId: string): Promise<string[] | null> {
    const raw = await this.kv.get(this.friendIdsKey(userId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
    } catch {
      return null;
    }
  }

  async setFriendIdsCache(userId: string, friendIds: string[], ttlSec = 60): Promise<void> {
    await this.kv.set(this.friendIdsKey(userId), JSON.stringify(friendIds), 'EX', ttlSec);
  }

  async invalidateFriendIdsCache(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const keys = userIds.map((userId) => this.friendIdsKey(userId));
    await this.kv.del(...keys);
  }

  async onModuleDestroy() {
    await Promise.all([this.pub.quit(), this.sub.quit(), this.kv.quit()]);
  }

  private connKey(userId: string) {
    return `presence:conn:${userId}`;
  }

  private effectiveKey(userId: string) {
    return `presence:effective:${userId}`;
  }

  private flagsKey(userId: string) {
    return `presence:flags:${userId}`;
  }

  // daeunki2수정 : 수정이유
  // source별 lastSeq 키로 변경
  private lastSeqKey(source: string, userId: string) {
    return `presence:lastSeq:${source}:${userId}`;
  }

  // daeunki2수정 : 수정이유
  // source별 lastEventAt 키로 변경
  private lastEventAtKey(source: string, userId: string) {
    return `presence:lastEventAt:${source}:${userId}`;
  }

  // daeunki2주석 : 주석이유
  // 기존 user 단일 키 방식. source 혼합 비교로 stale 오판이 발생할 수 있어 비활성화.
  // private lastSeqKey(userId: string) {
  //   return `presence:lastSeq:${userId}`;
  // }
  //
  // private lastEventAtKey(userId: string) {
  //   return `presence:lastEventAt:${userId}`;
  // }

  private eventDedupKey(eventId: string) {
    return `presence:event:${eventId}`;
  }

  private lastSeenKey(userId: string) {
    return `presence:lastSeen:${userId}`;
  }

  private friendIdsKey(userId: string) {
    return `presence:friends:${userId}`;
  }

  private aliveKey(userId: string) {
    return `presence:alive:${userId}`;
  }
}
