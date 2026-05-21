import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import {
  PRESENCE_RAW_CHANNEL,
  PresenceEventType,
  PresenceRawEvent,
} from '../types/presence.types';
import { GAME_INVITE_WAKEUP_CHANNEL } from '../engine/game-engine.constants';

export interface GameSession {
  gameId: string;
  p1: string;
  p2: string;
  state: 'waiting' | 'playing' | 'ended';
  createdAt: string;
}

@Injectable()
export class GameRedis implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly pub: Redis;

  // 이유: 매칭 잠금/큐/세션 키 prefix를 한 곳에서 관리해 흩어지지 않게 함.
  // 큐는 게스트/회원 분리 — 게스트끼리, 회원끼리 매칭.
  private readonly LOCK_KEY = 'game:match:lock';
  private readonly LOCK_TTL_SEC = 5;

  private queueKey(isGuest: boolean): string {
    return isGuest ? 'game:queue:guest' : 'game:queue:user';
  }

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') ?? 'redis';
    const port = Number(this.configService.get<string>('REDIS_PORT') ?? 6379);
    this.client = new Redis({ host, port });
    this.pub = new Redis({ host, port });
  }

  // ───────── 큐 ─────────

  async enqueue(userId: string, socketId: string, isGuest: boolean): Promise<void> {
    // 이유: 이미 큐에 있는 유저가 다시 join_queue를 호출해도 중복 PUSH 되지 않게 LREM 후 RPUSH.
    // 같은 유저가 신분 바뀌어 양 큐에 동시 등록되는 것도 차단(혹시 모를 토큰 갱신 케이스).
    const queue = this.queueKey(isGuest);
    const otherQueue = this.queueKey(!isGuest);
    await this.client.lrem(queue, 0, userId);
    await this.client.lrem(otherQueue, 0, userId);
    await this.client.rpush(queue, userId);
    await this.client.set(this.socketKey(userId), socketId);
  }

  async removeFromQueue(userId: string, isGuest: boolean): Promise<number> {
    const removed = await this.client.lrem(this.queueKey(isGuest), 0, userId);
    await this.client.del(this.socketKey(userId));
    return removed;
  }

  async queueLength(isGuest: boolean): Promise<number> {
    return this.client.llen(this.queueKey(isGuest));
  }

  // 이유: 매칭 시 두 명을 원자적으로 꺼내기 위해 한 번에 머리에서 2개 LPOP.
  async popTwo(isGuest: boolean): Promise<string[]> {
    const result = (await this.client.lpop(this.queueKey(isGuest), 2)) as string[] | null;
    return result ?? [];
  }

  async pushBackToFront(userId: string, socketId: string | null, isGuest: boolean): Promise<void> {
    // 이유: 한쪽 alive 검증 실패로 매칭이 무산됐을 때, 살아남은 한 명은 큐 앞에 되돌려 다음 라운드에서 우선 처리.
    if (socketId) {
      await this.client.set(this.socketKey(userId), socketId);
    }
    await this.client.lpush(this.queueKey(isGuest), userId);
  }

  async getQueueSocketId(userId: string): Promise<string | null> {
    return this.client.get(this.socketKey(userId));
  }

  async clearQueueSocket(userId: string): Promise<void> {
    await this.client.del(this.socketKey(userId));
  }

  // ───────── 매칭 잠금 ─────────

  async acquireMatchLock(): Promise<string | null> {
    const token = randomUUID();
    const ok = await this.client.set(this.LOCK_KEY, token, 'EX', this.LOCK_TTL_SEC, 'NX');
    return ok === 'OK' ? token : null;
  }

  async releaseMatchLock(token: string): Promise<void> {
    // 이유: 자기가 건 락만 풀도록 토큰 일치 시에만 DEL (Lua eval로 원자성 보장).
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
    await this.client.eval(script, 1, this.LOCK_KEY, token);
  }

  // ───────── 게임 세션 ─────────

  async createSession(p1: string, p2: string): Promise<GameSession> {
    const gameId = randomUUID();
    const session: GameSession = {
      gameId,
      p1,
      p2,
      state: 'waiting',
      createdAt: new Date().toISOString(),
    };
    await this.client.hset(this.sessionKey(gameId), session as unknown as Record<string, string>);
    await this.client.set(this.userGameKey(p1), gameId);
    await this.client.set(this.userGameKey(p2), gameId);
    return session;
  }

  async getSession(gameId: string): Promise<GameSession | null> {
    const raw = await this.client.hgetall(this.sessionKey(gameId));
    if (!raw || Object.keys(raw).length === 0) return null;
    return raw as unknown as GameSession;
  }

  async getUserGameId(userId: string): Promise<string | null> {
    return this.client.get(this.userGameKey(userId));
  }

  async deleteSession(gameId: string): Promise<void> {
    const session = await this.getSession(gameId);
    await this.client.del(this.sessionKey(gameId));
    if (session) {
      await this.client.del(this.userGameKey(session.p1));
      await this.client.del(this.userGameKey(session.p2));
    }
  }

  // ───────── presence raw 발행 ─────────

  // suna : 친구 초대 시 gateway 의 presence 소켓을 통해 B 를 깨우기 위한 publish.
  // payload 는 frontend usePresenceSocket 이 받을 'game.invite' 이벤트의 본문이 된다.
  async publishInviteWakeup(
    targetUserId: string,
    inviterUserId: string,
    inviterNickname: string,
  ): Promise<void> {
    const payload = {
      targetUserId,
      inviterUserId,
      inviterNickname,
      at: new Date().toISOString(),
    };
    await this.pub.publish(GAME_INVITE_WAKEUP_CHANNEL, JSON.stringify(payload));
  }

  async publishPresence(userId: string, type: PresenceEventType): Promise<void> {
    // 이유: gateway/presence.service가 source별 user별 단조 증가 seq를 요구하므로 INCR로 보장.
    const seq = await this.pub.incr(`presence:seq:game-service:${userId}`);
    const event: PresenceRawEvent = {
      eventId: randomUUID(),
      userId,
      type,
      source: 'game-service',
      seq,
      at: new Date().toISOString(),
      version: 1,
    };
    await this.pub.publish(PRESENCE_RAW_CHANNEL, JSON.stringify(event));
  }

  async onModuleDestroy() {
    await Promise.all([this.client.quit(), this.pub.quit()]);
  }

  // ───────── key 헬퍼 ─────────

  private socketKey(userId: string) {
    return `game:queue:socket:${userId}`;
  }

  private sessionKey(gameId: string) {
    return `game:session:${gameId}`;
  }

  private userGameKey(userId: string) {
    return `game:user:${userId}`;
  }
}
