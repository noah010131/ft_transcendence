import { Injectable, Logger } from '@nestjs/common';
import { Namespace } from 'socket.io';
import { GameRedis } from '../redis/game.redis';
import type { MatchResult } from './matchmaking.service';

// suna : pending 상태인 친구 초대.
// 친구 초대는 큐를 거치지 않고 A 의 game socket 만 살아있는 상태에서 진행되므로
// 일반 매칭과 다른 별도 인메모리 저장소가 필요하다.
type PendingInvite = {
  inviterUserId: string;
  inviterSocketId: string;
  inviterIsGuest: boolean;
  inviterNickname: string;
  timeoutHandle: NodeJS.Timeout;
};

@Injectable()
export class FriendInviteService {
  private readonly logger = new Logger(FriendInviteService.name);

  // suna : key = targetUserId (B). target 1명당 동시 초대 1개만 허용 (단순화).
  private readonly pendingInvites = new Map<string, PendingInvite>();

  // suna : 30초 안에 B 의 game socket 이 안 들어오면 자동 만료.
  private readonly INVITE_TTL_MS = 30_000;

  constructor(private readonly gameRedis: GameRedis) {}

  /**
   * suna : A 가 invite_friend 를 emit 했을 때 호출.
   * Redis 의 user->game 매핑으로 양쪽 in-game 여부를 검증하고, 통과하면 wakeup publish + pending 등록.
   *
   * 반환값: 실패 시 거절 코드 문자열, 성공 시 null.
   * 게임서비스 tsconfig 가 strictNullChecks=false 라 discriminated union narrowing 이 동작하지 않아
   * 단순 `string | null` 형태로 둔다.
   */
  async invite(
    server: Namespace,
    inviter: { userId: string; socketId: string; isGuest: boolean; nickname: string },
    targetUserId: string,
  ): Promise<string | null> {
    if (inviter.userId === targetUserId) {
      return 'CANNOT_INVITE_SELF';
    }
    if (this.pendingInvites.has(targetUserId)) {
      return 'TARGET_ALREADY_INVITED';
    }
    // suna : inviter 가 이미 다른 target 에게 초대 보낸 상태면 거절(이중 초대 방지).
    for (const invite of this.pendingInvites.values()) {
      if (invite.inviterUserId === inviter.userId) {
        return 'ALREADY_INVITING';
      }
    }

    const inviterGame = await this.gameRedis.getUserGameId(inviter.userId);
    if (inviterGame) {
      return 'ALREADY_IN_GAME';
    }
    const targetGame = await this.gameRedis.getUserGameId(targetUserId);
    if (targetGame) {
      return 'TARGET_BUSY';
    }

    const timeoutHandle = setTimeout(() => {
      this.expireInvite(targetUserId, server);
    }, this.INVITE_TTL_MS);

    this.pendingInvites.set(targetUserId, {
      inviterUserId: inviter.userId,
      inviterSocketId: inviter.socketId,
      inviterIsGuest: inviter.isGuest,
      inviterNickname: inviter.nickname,
      timeoutHandle,
    });

    await this.gameRedis.publishInviteWakeup(targetUserId, inviter.userId, inviter.nickname);
    this.logger.log(
      `invite created: inviter=${inviter.userId} target=${targetUserId}`,
    );
    return null;
  }

  /**
   * suna : B 의 game socket 이 connect 되었을 때 gateway 가 호출.
   * pending invite 가 있으면 세션을 만들어 MatchResult 형태로 반환 -> gateway 가 prepareMatch(mode='friend') 호출.
   */
  async tryFulfillOnConnect(
    server: Namespace,
    target: { userId: string; socketId: string; isGuest: boolean },
  ): Promise<MatchResult | null> {
    const invite = this.pendingInvites.get(target.userId);
    if (!invite) return null;

    // inviter 가 여전히 같은 socketId 로 살아있는지 확인.
    const inviterSocket = server.sockets.get(invite.inviterSocketId);
    if (!inviterSocket || inviterSocket.data?.userId !== invite.inviterUserId) {
      this.clearInviteAndTimeout(target.userId);
      this.logger.warn(
        `invite stale: inviter socket gone (inviter=${invite.inviterUserId}, target=${target.userId})`,
      );
      // suna : inviter 가 사라진 상태로 B 가 들어왔으니 B 에게 timeout 알림.
      server.to(target.socketId).emit('queue_error', {
        code: 'INVITE_INVITER_GONE',
        message: 'Inviter is no longer connected.',
      });
      return null;
    }

    this.clearInviteAndTimeout(target.userId);

    // suna : 일반 매칭의 tryMatch 와 동일하게 GameSession + 룸 join + match_found 발행.
    const session = await this.gameRedis.createSession(invite.inviterUserId, target.userId);
    const room = `game:${session.gameId}`;
    await server.in(invite.inviterSocketId).socketsJoin(room);
    await server.in(target.socketId).socketsJoin(room);

    // opponent 를 userId → nickname 으로 변경. inviterSocket 은 위에서 이미 가져왔고 target 만 추가 조회.
    const targetSocket = server.sockets.get(target.socketId);
    const inviterNickname = String(inviterSocket.data?.nickname ?? invite.inviterUserId);
    const targetNickname = String(targetSocket?.data?.nickname ?? target.userId);
    server.to(invite.inviterSocketId).emit('match_found', {
      gameId: session.gameId,
      side: 'p1',
      opponent: targetNickname,
    });
    server.to(target.socketId).emit('match_found', {
      gameId: session.gameId,
      side: 'p2',
      opponent: inviterNickname,
    });

    // presence: matching 단계는 없었으므로 matching_ended 만 형식적으로 보낼 필요 없음.
    // game_started 는 양쪽 ready 후 GameRuntimeService.startMatch 에서 발행.

    this.logger.log(
      `invite fulfilled: inviter=${invite.inviterUserId} target=${target.userId} gameId=${session.gameId}`,
    );

    return {
      session,
      p1SocketId: invite.inviterSocketId,
      p2SocketId: target.socketId,
    };
  }

  /**
   * suna : userId 가 inviter 또는 target 인 pending invite 를 모두 정리한다.
   * gateway 의 handleDisconnect 에서 호출.
   * 반환: 다른 쪽 socketId 가 살아있으면 그 socket 으로 알림 보낼 수 있게 넘겨준다.
   */
  cancelInvolvingUser(
    userId: string,
    server: Namespace,
  ): { canceled: boolean } {
    // 케이스 1: B(=userId)가 끊김 -> pending invite key 가 userId
    const asTarget = this.pendingInvites.get(userId);
    if (asTarget) {
      this.clearInviteAndTimeout(userId);
      const inviterSocket = server.sockets.get(asTarget.inviterSocketId);
      if (inviterSocket) {
        inviterSocket.emit('queue_error', {
          code: 'INVITE_TARGET_LEFT',
          message: 'Friend declined or disconnected.',
        });
        inviterSocket.emit('match_canceled');
      }
      this.logger.log(`invite canceled (target left): target=${userId}`);
      return { canceled: true };
    }

    // 케이스 2: A(=userId)가 끊김 -> map 을 훑어 inviter 일치 항목 찾기
    for (const [targetId, invite] of this.pendingInvites) {
      if (invite.inviterUserId === userId) {
        this.clearInviteAndTimeout(targetId);
        // B 의 game socket 은 아직 안 들어왔거나 들어와도 tryFulfill 에서 정리됨. 알림 생략.
        this.logger.log(`invite canceled (inviter left): inviter=${userId} target=${targetId}`);
        return { canceled: true };
      }
    }

    return { canceled: false };
  }

  private expireInvite(targetUserId: string, server: Namespace): void {
    const invite = this.pendingInvites.get(targetUserId);
    if (!invite) return;
    this.pendingInvites.delete(targetUserId);
    const inviterSocket = server.sockets.get(invite.inviterSocketId);
    if (inviterSocket) {
      inviterSocket.emit('queue_error', {
        code: 'INVITE_TIMEOUT',
        message: 'Friend invite timed out.',
      });
      inviterSocket.emit('match_canceled');
    }
    this.logger.log(`invite expired: inviter=${invite.inviterUserId} target=${targetUserId}`);
  }

  private clearInviteAndTimeout(targetUserId: string): void {
    const invite = this.pendingInvites.get(targetUserId);
    if (!invite) return;
    clearTimeout(invite.timeoutHandle);
    this.pendingInvites.delete(targetUserId);
  }
}
