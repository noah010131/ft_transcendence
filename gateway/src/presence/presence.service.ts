/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   presence.service.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/08 11:55:07 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/08 12:56:15 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */



import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PRESENCE_RAW_CHANNEL,
  PRESENCE_UPDATED_CHANNEL,
  PresenceRawEvent,
  PresenceState,
  PresenceUpdatedEvent,
  PublicPresenceState,
} from './presence.types';
import { PresenceRedis } from './presence.redis';

@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly heartbeatTtlSec = 15;
  private readonly heartbeatSweepMs = 5000;
  private heartbeatSweepTimer: NodeJS.Timeout | null = null;

  constructor(private readonly redis: PresenceRedis) {}

  async publishRawEvent(event: PresenceRawEvent): Promise<void> {
    await this.redis.getPublisher().publish(PRESENCE_RAW_CHANNEL, JSON.stringify(event));
  }

  async publishGatewayConnectionEvent(
    userId: string,
    type: 'connected' | 'disconnected',
  ): Promise<void> {
    // gateway source 이벤트는 user별 단조 증가 seq로 발행하여 순서 보장을 강화
    const seq = await this.redis.getPublisher().incr(`presence:seq:gateway:${userId}`);
    const event: PresenceRawEvent = {
      eventId: randomUUID(),
      userId,
      type,
      source: 'gateway',
      seq,
      at: new Date().toISOString(),
      version: 1,
    };
    await this.publishRawEvent(event);
  }

  async markHeartbeat(userId: string): Promise<void> {
    await this.redis.touchAlive(userId, this.heartbeatTtlSec);
  }

  // 1. 이벤트 수신 
  async startRawEventConsumer(): Promise<void> {
    const sub = this.redis.getSubscriber();
    await sub.subscribe(PRESENCE_RAW_CHANNEL);
    sub.on('message', async (channel, payload) => {
      if (channel !== PRESENCE_RAW_CHANNEL) return;
      const event = this.parseEvent(payload);
      if (!event) return;
      await this.handleRawEvent(event);
    });
    console.log('[presence] subscribed channel:', PRESENCE_RAW_CHANNEL);
  }

  // 6. heartbeat 관련
  startHeartbeatReconciler(): void {
    if (this.heartbeatSweepTimer) return;
    this.heartbeatSweepTimer = setInterval(() => {
      void this.reconcileHeartbeatTimeouts();
    }, this.heartbeatSweepMs);
  }

  async getPresence(userId: string) {
    const internalStatus = await this.redis.getEffectiveState(userId);
    const connCount = await this.redis.getConnectionCount(userId);
    const flags = await this.redis.getFlags(userId);
    return {
      userId,
      connCount,
      flags,
      internalStatus,
      publicStatus: this.toPublicStatus(internalStatus),
    };
  }

  async invalidateFriendCaches(userIds: string[]): Promise<void> {
    const normalized = Array.from(
      new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    await this.redis.invalidateFriendIdsCache(normalized);
  }

  // 2. 검증처리 + 오케스트레이션
  private async handleRawEvent(event: PresenceRawEvent): Promise<void> {
    // eventId 기준으로 1회만 처리
    const firstSeen = await this.redis.markEventProcessed(event.eventId);
    if (!firstSeen) {
      return;
    }

    // 흐름 제어: 오래된 이벤트는 버리고 최신 이벤트만 상태 계산에 반영
    if (!(await this.isEventFresh(event))) {
      return;
    }

    const prevStatus = await this.redis.getEffectiveState(event.userId);
    await this.applyEventToStorage(event); // 3번함수
    const nextStatus = await this.recomputeEffectiveStatus(event.userId); //4번 함수
    await Promise.all([
      // daeunki2수정 : 수정이유
      // lastSeq/lastEventAt는 source별로 분리 저장해야 이벤트 신선도 판정 충돌을 막을 수 있다.
      this.redis.setLastSequence(event.source, event.userId, event.seq),
      this.redis.setLastEventAt(event.source, event.userId, event.at),
      // 실제 기록: 계산된 최종 상태를 Redis에 저장
      this.redis.setEffectiveState(event.userId, nextStatus),
    ]);

    // daeunki2주석 : 주석이유
    // 기존 user 단일 키 저장 방식. source 혼합 시 stale 오판 가능.
    // await Promise.all([
    //   this.redis.setLastSequence(event.userId, event.seq),
    //   this.redis.setLastEventAt(event.userId, event.at),
    //   this.redis.setEffectiveState(event.userId, nextStatus),
    // ]);
    if (prevStatus === nextStatus) return; // 상태 변화 없으면 스킵
    // 업데이트 이벤트 생성
    const updatedEvent: PresenceUpdatedEvent = {
      userId: event.userId,
      internalStatus: nextStatus,
      publicStatus: this.toPublicStatus(nextStatus),
      at: new Date().toISOString(),
      version: 1,
    };
    //5. 업데이트 이벤트 발행 발행
    await this.redis
      .getPublisher()
      .publish(PRESENCE_UPDATED_CHANNEL, JSON.stringify(updatedEvent));
  }


  // 3. 이벤트 타입별 저장 
  private async applyEventToStorage(event: PresenceRawEvent): Promise<void> {
    const flags = await this.redis.getFlags(event.userId);
    switch (event.type) {
      case 'connected':
        await this.redis.incrementConnection(event.userId);
        await this.redis.touchAlive(event.userId, this.heartbeatTtlSec);
        return;
      case 'disconnected':
        // await this.redis.clearAlive(event.userId);
        // await this.redis.decrementConnection(event.userId);
        { // 기존에 너무 가차없이 끊어버려서 쉽게 오프라인 처리 되어 버림.
          const remainingConnections = await this.redis.decrementConnection(event.userId);
          if (remainingConnections === 0) {
            await this.redis.clearAlive(event.userId);
          }
        }
        return;
      case 'matching_started':
        flags.matching = true;
        await this.redis.setFlags(event.userId, flags);
        return;
      case 'matching_ended':
        flags.matching = false;
        await this.redis.setFlags(event.userId, flags);
        return;
      case 'game_started':
        flags.inGame = true;
        flags.matching = false;
        await this.redis.setFlags(event.userId, flags);
        return;
      case 'game_ended':
        flags.inGame = false;
        await this.redis.setFlags(event.userId, flags);
        return;
      default:
        return;
    }
  }

  //4. 최종 상태 계산 
  private async recomputeEffectiveStatus(userId: string): Promise<PresenceState> {
    const connCount = await this.redis.getConnectionCount(userId);
    const flags = await this.redis.getFlags(userId);
    const alive = await this.redis.isAlive(userId);
    if (flags.inGame) return 'IN_GAME';
    if (flags.matching) return 'MATCHING';
    if (connCount > 0 && alive) return 'ONLINE';
    return 'OFFLINE';
  }

  private toPublicStatus(state: PresenceState): PublicPresenceState {
    if (state === 'IN_GAME') return 'IN_GAME';
    if (state === 'OFFLINE') return 'OFFLINE';
    return 'ONLINE';
  }

  private parseEvent(payload: string): PresenceRawEvent | null {
    try {
      const parsed = JSON.parse(payload) as PresenceRawEvent;
      if (
        !parsed?.userId ||
        !parsed?.eventId ||
        !parsed?.type ||
        !parsed?.source ||
        !parsed?.at ||
        typeof parsed.seq !== 'number'
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async isEventFresh(event: PresenceRawEvent): Promise<boolean> {
    const [lastSeq, lastAtMs] = await Promise.all([
      // daeunki2수정 : 수정이유
      // freshness 판정은 source 내부 순서 보장 기준으로만 비교해야 정확하다.
      this.redis.getLastSequence(event.source, event.userId),
      this.redis.getLastEventAt(event.source, event.userId),
    ]);

    // daeunki2주석 : 주석이유
    // 기존 user 단일 키 조회 방식. source가 다르면 seq 공간이 달라 stale 오판 가능.
    // const [lastSeq, lastAtMs] = await Promise.all([
    //   this.redis.getLastSequence(event.userId),
    //   this.redis.getLastEventAt(event.userId),
    // ]);
    if (event.seq < lastSeq) return false;
    if (event.seq > lastSeq) return true;
    const eventAtMs = Date.parse(event.at);
    if (Number.isNaN(eventAtMs)) return false;
    return eventAtMs >= lastAtMs;
  }

  private async reconcileHeartbeatTimeouts(): Promise<void> {
    const users = await this.redis.getUsersWithConnections();
    for (const userId of users) {
      const alive = await this.redis.isAlive(userId);
      if (alive) continue;
      const prevStatus = await this.redis.getEffectiveState(userId);
      await this.redis.setConnectionCount(userId, 0);
      const nextStatus = await this.recomputeEffectiveStatus(userId);
      await this.redis.setEffectiveState(userId, nextStatus);
      if (prevStatus === nextStatus) continue;
      const updatedEvent: PresenceUpdatedEvent = {
        userId,
        internalStatus: nextStatus,
        publicStatus: this.toPublicStatus(nextStatus),
        at: new Date().toISOString(),
        version: 1,
      };
      await this.redis
        .getPublisher()
        .publish(PRESENCE_UPDATED_CHANNEL, JSON.stringify(updatedEvent));
    }
  }

  onModuleDestroy() {
    if (this.heartbeatSweepTimer) {
      clearInterval(this.heartbeatSweepTimer);
      this.heartbeatSweepTimer = null;
    }
  }
}
