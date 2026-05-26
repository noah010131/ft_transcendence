/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game-ai.gateway.helper.ts                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/17 20:38:46 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/17 20:41:52 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { MatchResult } from './matchmaking/matchmaking.service';
import { GameRedis } from './redis/game.redis';
import type { GameSession } from './redis/game.redis';

@Injectable()
export class GameAiGatewayHelper {
  // start_ai_game 이후 ready를 기다리는 임시 저장소.
  // key는 소켓ID, value는 Runtime.startMatch에 넘길 MatchResult.
  private readonly pendingAiMatches = new Map<string, MatchResult>();

  constructor(private readonly gameRedis: GameRedis) {}

  // daeunki2추가 : 추가한 사유
  // AI 시작 조건(gameType)을 검증하고, 통과 시 pending 매치를 준비한다.
  async startAiGame(client: Socket, gameType: string): Promise<void> {
    if (gameType !== 'ai') {
      client.emit('queue_error', {
        code: 'INVALID_GAME_TYPE',
        message: 'AI game start requires gameType=ai.',
      });
      return;
    }

    const pending = await this.createAiMatchForSocket(client);
    if (!pending) return;
    this.pendingAiMatches.set(client.id, pending);
  }

  // daeunki2추가 : 추가한 사유
  // ready 이벤트 시점에 pending 매치를 소비(조회+삭제)하여 Runtime 시작에 넘긴다.
  consumePendingForReady(socketId: string): MatchResult | null {
    const pending = this.pendingAiMatches.get(socketId);
    if (!pending) return null;
    this.pendingAiMatches.delete(socketId);
    return pending;
  }

  // daeunki2추가 : 추가한 사유
  // ready 전에 끊긴 AI 매치의 Redis 세션까지 정리해 ALREADY_IN_GAME 고아 상태를 방지한다.
  async cleanupPendingAiMatch(socketId: string): Promise<void> {
    const pending = this.pendingAiMatches.get(socketId);
    if (!pending) return;
    this.pendingAiMatches.delete(socketId);
    await this.gameRedis.deleteSession(pending.session.gameId);
    console.log(
      `[Game][AI] pending session cleaned before ready socketId=${socketId} gameId=${pending.session.gameId}`,
    );
  }

  // daeunki2추가 : 추가한 사유
  // AI 대전용 진입 함수. 큐를 우회해 match_found까지 준비하고 ready 대기 데이터(MatchResult)를 반환한다.
  private async createAiMatchForSocket(client: Socket): Promise<MatchResult | null> {
    const userId: string | undefined = client.data.userId;
    const isGuest: boolean = Boolean(client.data.isGuest);
    const nickname: string = String(client.data.nickname ?? userId ?? 'PLAYER');
    if (!userId) {
      client.emit('queue_error', { code: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return null;
    }

    const existing = await this.gameRedis.getUserGameId(userId);
    if (existing) {
      client.emit('queue_error', {
        code: 'ALREADY_IN_GAME',
        message: 'You are already in an ongoing game.',
        gameId: existing,
      });
      return null;
    }

    // Runtime.startMatch 계약을 맞추기 위해 Redis 세션을 먼저 만들고 AI 상대 식별자를 부여한다.
    const aiUserId = `AI_BOT_${userId}`;
    const session: GameSession = await this.gameRedis.createSession(userId, aiUserId);
    const gameId = session.gameId;
    const side: 'p1' | 'p2' = 'p1';
    const aiOpponent = 'AI';

    client.join(`game:${gameId}`);
    client.emit('match_found', {
      gameId,
      side,
      opponent: aiOpponent,
      mode: 'ai',
      isGuest,
      nickname,
    });

    // ready 전에 끊기면 pending 상태를 정리해 다음 시작에 영향 없도록 한다.
    client.once('disconnect', () => {
      void this.cleanupPendingAiMatch(client.id);
    });

    console.log(
      `[Game][AI] ai match prepared userId=${userId} socketId=${client.id} gameId=${gameId}`,
    );

    // p2는 실제 소켓이 없으므로 동일 소켓ID를 매핑해 Runtime 공통 경로를 재사용한다.
    return {
      session,
      p1SocketId: client.id,
      p2SocketId: client.id,
    };
  }
}
