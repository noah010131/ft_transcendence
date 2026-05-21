import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PresenceState } from './presence.types';

/*
기존:
userId별 숫자 counter로 접속 여부 판단
connect    -> userId counter +1
disconnect -> userId counter -1
counter > 0 -> ONLINE
counter = 0 -> OFFLINE
문제는 reconnect, React StrictMode, polling 재연결, 중복 disconnect, 서버 재시작 같은 상황에서
숫자 카운터가 실제 열린 소켓 목록과 어긋남 >> 표기가 제대로 안됨. 

변경:
userId별 socketId Set으로 접속 여부 판단
connect:
  SADD presence:sockets:{userId} socketId
  SCARD > 0 이면 ONLINE

disconnect:
  SREM presence:sockets:{userId} socketId
  SCARD = 0 이면 OFFLINE
하나의 아이디가 점유하는 소켓들의 숫자를 카운트 하는 방식으로 변경하여 안정성을 확보. 
*/

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

  // daeunki2추가 :  숫자 counter 대신 실제 socket.id Set으로 접속 상태를 관리해 중복 disconnect와 재연결 흔들림을 줄인다.
  async addSocket(userId: string, socketId: string): Promise<number> {
    return this.kv.sadd(this.socketsKey(userId), socketId);
  }

  // daeunki2추가 : 특정 socket.id만 제거해 여러 탭 중 마지막 연결이 끊겼는지 정확히 판단한다.
  async removeSocket(userId: string, socketId: string): Promise<number> {
    return this.kv.srem(this.socketsKey(userId), socketId);
  }

  // daeunki2추가 : 현재 살아 있다고 판단되는 socket.id 개수를 상태 계산과 조회 응답에 사용한다.
  async getSocketCount(userId: string): Promise<number> {
    return this.kv.scard(this.socketsKey(userId));
  }

  // daeunki2추가 : heartbeat reconciliation에서 user별 socket Set을 순회하기 위한 조회 함수다.
  async getSocketIds(userId: string): Promise<string[]> {
    return this.kv.smembers(this.socketsKey(userId));
  }

  // daeunki2추가 : 정상 disconnect가 오지 않은 socket 찌꺼기를 찾기 위해 socket.id별 TTL을 관리한다.
  async touchSocketAlive(userId: string, socketId: string, ttlSec: number): Promise<void> {
    await this.kv.set(this.socketAliveKey(userId, socketId), '1', 'EX', ttlSec);
  }

  // daeunki2추가 : disconnect가 처리된 socket의 heartbeat TTL 키를 즉시 제거한다.
  async clearSocketAlive(userId: string, socketId: string): Promise<void> {
    await this.kv.del(this.socketAliveKey(userId, socketId));
  }

  // daeunki2추가 : 비정상 종료로 남은 socket.id인지 reconciliation에서 판단한다.
  async isSocketAlive(userId: string, socketId: string): Promise<boolean> {
    const exists = await this.kv.exists(this.socketAliveKey(userId, socketId));
    return exists === 1;
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

  // daeunki2수정 : 수정
  // seq는 source별 단조 증가 값이라 user 단일 키로 비교하면 다른 source 이벤트와 충돌한다.
  // source + userId 조합으로 분리 저장해야 stale 판정이 정확해진다.
  async getLastSequence(source: string, userId: string): Promise<number> {
    const raw = await this.kv.get(this.lastSeqKey(source, userId));
    return Number(raw ?? 0);
  }

  // daeunki2수정 : 수정
  // source별 최신 seq 저장
  async setLastSequence(source: string, userId: string, seq: number): Promise<void> {
    await this.kv.set(this.lastSeqKey(source, userId), String(seq));
  }

  // daeunki2수정 : 수정
  // at 타임스탬프도 source별로 분리해 동일 seq 동률 시 비교 정확도를 맞춘다.
  async getLastEventAt(source: string, userId: string): Promise<number> {
    const raw = await this.kv.get(this.lastEventAtKey(source, userId));
    if (!raw) return 0;
    const time = Date.parse(raw);
    return Number.isNaN(time) ? 0 : time;
  }

  // daeunki2수정 : 수정
  // source별 최신 at 저장
  async setLastEventAt(source: string, userId: string, at: string): Promise<void> {
    await this.kv.set(this.lastEventAtKey(source, userId), at);
  }

  async markEventProcessed(eventId: string, ttlSec = 120): Promise<boolean> {
    const result = await this.kv.set(this.eventDedupKey(eventId), '1', 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  async getUsersWithSockets(): Promise<string[]> {
    const users: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.kv.scan(cursor, 'MATCH', 'presence:sockets:*', 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        const userId = key.slice('presence:sockets:'.length);
        if (!userId) continue;
        const count = await this.kv.scard(key);
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

  private socketsKey(userId: string) {
    return `presence:sockets:${userId}`;
  }

  private socketAliveKey(userId: string, socketId: string) {
    return `presence:socketAlive:${userId}:${socketId}`;
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

  // daeunki2주석 : 주석이유
  // 기존 user 단위 counter/heartbeat 방식. 중복 disconnect, 재연결, 다중 탭에서 실제 연결 목록과 어긋날 수 있어
  // socket.id Set 방식으로 대체하고 하단에 보존한다.
  //
  // async getConnectionCount(userId: string): Promise<number> {
  //   const raw = await this.kv.get(this.connKey(userId));
  //   return Number(raw ?? 0);
  // }
  //
  // async incrementConnection(userId: string): Promise<number> {
  //   return this.kv.incr(this.connKey(userId));
  // }
  //
  // async decrementConnection(userId: string): Promise<number> {
  //   const key = this.connKey(userId);
  //   const count = await this.kv.decr(key);
  //   if (count <= 0) {
  //     await this.kv.set(key, '0');
  //     return 0;
  //   }
  //   return count;
  // }
  //
  // async touchAlive(userId: string, ttlSec: number): Promise<void> {
  //   await this.kv.set(this.aliveKey(userId), '1', 'EX', ttlSec);
  // }
  //
  // async clearAlive(userId: string): Promise<void> {
  //   await this.kv.del(this.aliveKey(userId));
  // }
  //
  // async isAlive(userId: string): Promise<boolean> {
  //   const exists = await this.kv.exists(this.aliveKey(userId));
  //   return exists === 1;
  // }
  //
  // async setConnectionCount(userId: string, count: number): Promise<void> {
  //   const normalized = count > 0 ? count : 0;
  //   await this.kv.set(this.connKey(userId), String(normalized));
  // }
  //
  // async getUsersWithConnections(): Promise<string[]> {
  //   const users: string[] = [];
  //   let cursor = '0';
  //   do {
  //     const [nextCursor, keys] = await this.kv.scan(cursor, 'MATCH', 'presence:conn:*', 'COUNT', 100);
  //     cursor = nextCursor;
  //     for (const key of keys) {
  //       const userId = key.slice('presence:conn:'.length);
  //       if (!userId) continue;
  //       const count = Number((await this.kv.get(key)) ?? 0);
  //       if (count > 0) {
  //         users.push(userId);
  //       }
  //     }
  //   } while (cursor !== '0');
  //   return users;
  // }
  //
  // private connKey(userId: string) {
  //   return `presence:conn:${userId}`;
  // }
  //
  // private aliveKey(userId: string) {
  //   return `presence:alive:${userId}`;
  // }
}
