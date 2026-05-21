import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { MatchmakingService } from './matchmaking/matchmaking.service';
import { FriendInviteService } from './matchmaking/friend-invite.service';
import { GameRedis } from './redis/game.redis';
import { GameRuntimeService } from './engine/game-runtime.service'; // daeunki2 추가
import { GameAiGatewayHelper } from './game-ai.gateway.helper'; // ai용 추가
import {
  GAME_INVITE_FRIEND_EVENT,
  GAME_JOIN_QUEUE_EVENT,
  GAME_MATCH_CANCELED_EVENT,
  GAME_MOVE_PADDLE_EVENT,
  GAME_READY_EVENT,
} from './engine/game-engine.constants';
import type { MovePaddlePayload } from './engine/game-engine.types'; //daeunki2추가

// suna : env에 콤마로 여러 origin을 넣을 수 있게 파싱. LAN IP 원격 접속 대응.
const gameCorsOrigin = (() => {
  const raw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
  const list = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
  return list.length === 1 ? list[0] : list;
})();

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: gameCorsOrigin,
    credentials: true,
  },
})



export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // 이유: @WebSocketGateway({ namespace: 'game' }) 사용 시 런타임에 주입되는 인스턴스는
  // 사실 Namespace 다. Server 로 두면 .sockets 가 default Namespace 로 추론돼
  // .sockets.values() / .sockets.get() 같은 Map API 가 보이지 않는다.
  @WebSocketServer() server: Namespace;

  constructor(
    private readonly matchmaking: MatchmakingService,
    private readonly gameRedis: GameRedis,
    private readonly gameRuntime: GameRuntimeService, // daeunki2 추가 : 게임 실행 로직
    private readonly friendInvite: FriendInviteService, // suna : 친구 초대 매칭 처리
    private readonly gameAiHelper: GameAiGatewayHelper, // ai용 추가
  ) {}

  // daeunki2 추가 : 패들 움직임
  @SubscribeMessage(GAME_MOVE_PADDLE_EVENT)
  onMovePaddle(client: Socket, payload: MovePaddlePayload) {
    this.gameRuntime.movePaddle(client, payload);
  }

  // suna : match_found 후 "게임 시작" 버튼을 누른 클라이언트가 보내는 ready 신호.
  // 양쪽 모두 ready 면 Runtime 에서 startMatch 가 실행돼 실제 게임 루프가 돈다.
  // suna : 클라가 일반/AI 구분 없이 항상 'ready' 만 보내므로, 핸들러 하나에서 분기 처리한다.
  // 우선순위: AI pending 있으면 AI 시작, 없으면 일반/친구초대 ready 핸드셰이크.
  @SubscribeMessage(GAME_READY_EVENT)
  async onReady(client: Socket) {
    // ai용 추가 : AI 매치 pending 슬롯이 있으면 그쪽 startMatch 로 즉시 시작
    const pendingAi = this.gameAiHelper.consumePendingForReady(client.id);
    if (pendingAi) {
      await this.gameRuntime.startMatch(pendingAi, this.server);
      return;
    }
    // suna : 일반 큐 / 친구초대 매치의 ready 핸드셰이크
    await this.gameRuntime.handleReady(client, this.server);
  }

  // suna : 친구 초대 시작. SocialPage 의 startGame 버튼에서 emit.
  // payload: { targetUserId: string }
  @SubscribeMessage(GAME_INVITE_FRIEND_EVENT)
  async onInviteFriend(client: Socket, payload: { targetUserId?: string }) {
    const userId: string | undefined = client.data.userId;
    if (!userId) {
      client.emit('queue_error', { code: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return;
    }
    const targetUserId = payload?.targetUserId;
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      client.emit('queue_error', { code: 'INVALID_INVITE_TARGET', message: 'Invalid target user.' });
      return;
    }

    const rejectCode = await this.friendInvite.invite(
      this.server,
      {
        userId,
        socketId: client.id,
        isGuest: Boolean(client.data.isGuest),
        nickname: String(client.data.nickname ?? userId),
      },
      targetUserId.trim(),
    );

    if (rejectCode) {
      // suna : 거절 코드가 있으면 그대로 클라이언트에 전달. 성공이면 다음 단계는 B 의 game socket connect 시 진행.
      client.emit('queue_error', {
        code: rejectCode,
        message: `Invite rejected: ${rejectCode}`,
      });
    }
  }

  private extractUserId(client: Socket): string | null {
    const headerId = client.handshake.headers['x-user-id'];
    if (typeof headerId === 'string' && headerId.trim() !== '') {
      return headerId;
    }
    const queryId = client.handshake.query.userId;
    if (typeof queryId === 'string' && queryId.trim() !== '') {
      return queryId;
    }
    return null;
  }

  // 이유: gateway가 JWT 검증 시 payload.isGuest=true 인 경우만 x-is-guest='true' 헤더를 박는다.
  // 그 외(헤더 없음)는 모두 회원으로 간주.
  private extractIsGuest(client: Socket): boolean {
    const header = client.handshake.headers['x-is-guest'];
    if (typeof header === 'string') return header === 'true';
    if (Array.isArray(header)) return header.includes('true');
    return false;
  }

  // daeunki2 수정 : 게임 결과 DB 저장 시 winner/loser nickname이 필요해서 소켓 query에서 nickname을 꺼낸다.
  private extractNickname(client: Socket): string {
    const queryNickname = client.handshake.query.nickname;
    if (typeof queryNickname === 'string' && queryNickname.trim() !== '') {
      return queryNickname.trim();
    }
    // daeunki2 수정 : 닉네임이 없는 예외 상황에서는 기록 저장이 깨지지 않도록 userId를 fallback으로 사용한다.
    return String(client.data.userId ?? '');
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      console.warn(`[Game] 인증 헤더 누락 -> 접속 거부 (socketId=${client.id})`);
      client.disconnect();
      return;
    }

    // 이유: 같은 userId 가 이미 다른 소켓(다른 탭/창)으로 연결돼 있으면 기존 소켓을 끊는다.
    // 큐는 userId 단일 키 기준이라 여러 소켓이 동시에 살아 있으면 socketId 덮어쓰기/
    // disconnect LREM 으로 양쪽 모두 매칭 권한을 잃는 케이스가 발생한다.
    // 정책: "유저당 게임 소켓 1개" 강제, 새 연결이 항상 우선.
    this.evictDuplicateSockets(userId, client.id);

    const isGuest = this.extractIsGuest(client);
    client.data.userId = userId;
    client.data.isGuest = isGuest;
    // daeunki2 수정 : Runtime 서비스가 게임 기록 저장에 사용할 nickname을 socket data에 보관한다.
    client.data.nickname = this.extractNickname(client);
    console.log(
      `[Game] 연결 성공: userId=${userId}, isGuest=${isGuest}, socketId=${client.id}`,
    );

    // suna : B 의 game socket 이 막 들어왔을 때 pending friend invite 가 있으면 즉시 매치 진입.
    // tryFulfillOnConnect 가 세션/룸/match_found 까지 처리하고 MatchResult 를 반환한다.
    void this.friendInvite
      .tryFulfillOnConnect(this.server, { userId, socketId: client.id, isGuest })
      .then((match) => {
        if (match) {
          this.gameRuntime.prepareMatch(match, isGuest, 'friend');
        }
      })
      .catch((err) => {
        console.error('[Game] tryFulfillOnConnect 실패', err);
      });
  }

  // 이유: namespace 의 모든 소켓을 훑어 동일 userId 인 기존 소켓을 종료한다.
  // 끊긴 소켓은 handleDisconnect 가 자동으로 큐 정리(matchmaking.dequeue)까지 처리한다.
  // message 는 i18n 우회를 막기 위해 영어 fallback 만 두고, 프론트는 code 기준으로 i18n 룩업한다.
  private evictDuplicateSockets(userId: string, incomingSocketId: string): void {
    for (const existing of this.server.sockets.values()) {
      if (existing.id === incomingSocketId) continue;
      if (existing.data?.userId !== userId) continue;
      console.warn(
        `[Game] 동일 userId 중복 연결 감지 → 기존 소켓 강제 종료: userId=${userId} oldSocketId=${existing.id} newSocketId=${incomingSocketId}`,
      );
      existing.emit('queue_error', {
        code: 'KICKED_BY_NEW_TAB',
        message: 'Connection closed because a new session started in another tab.',
      });
      existing.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    const isGuest: boolean = Boolean(client.data.isGuest);
    if (!userId) return;

    console.log(`[Game] 연결 종료: userId=${userId}, socketId=${client.id}`);

    // ai용 추가
    await this.gameAiHelper.cleanupPendingAiMatch(client.id);

    // 이유: 큐 대기 중 끊긴 경우 큐에서 빼고 matching_ended 발행.
    await this.matchmaking.dequeue(userId, isGuest);

    // suna : 친구 초대 단계에 머물러 있던 사용자(inviter 또는 target) 정리.
    // pending invite 가 정리되고 inviter 가 살아있으면 그쪽에 match_canceled 통보.
    this.friendInvite.cancelInvolvingUser(userId, this.server);

    // suna : match_found 후 ready 대기 중 끊긴 경우 처리.
    // 살아남은 상대가 있으면 Redis 세션은 폐기되고 (queue 모드일 때만) 상대는 다시 큐로 들어간다.
    const pendingResult = await this.gameRuntime.handlePendingDisconnect(client, this.server);
    if (pendingResult.wasPending) {
      // daeunki2 : 상태변화 추가
      // ready 대기(pending)에서 이탈한 사용자 상태를 MATCHING 종료로 정리
      await this.gameRedis.publishPresence(userId, 'matching_ended');
      await this.handleSurvivor(userId, pendingResult);
      return;
    }

    // 이유: 매칭된 게임 진행 중 끊긴 경우는 다은님 영역(로직 서비스)에서 game_ended 처리.
    // daeunki2 수정 : 실제 게임 중 disconnect는 Runtime 서비스가 기권 처리, game_over, 기록 저장, Redis 정리를 담당한다.
    await this.gameRuntime.handleDisconnect(client, this.server);
  }

  // suna : pending 단계에서 한쪽이 끊겼을 때 호출. 끊긴 쪽은 socket 이 닫혔으므로 별도 알림 불필요.
  // queue 모드면 살아남은 쪽을 큐로 다시 넣고, friend 모드면 매치만 취소하고 끝.
  private async handleSurvivor(
    leaverUserId: string,
    pending: Awaited<ReturnType<GameRuntimeService['handlePendingDisconnect']>>,
  ): Promise<void> {
    if (!pending.alive) {
      console.log(`[Game] pending 양쪽 모두 종료: leaver=${leaverUserId} mode=${pending.mode}`);
      return;
    }
    const { userId: aliveUserId, socketId: aliveSocketId, isGuest } = pending.alive;

    // suna : 어떤 모드든 살아남은 쪽 모달이 "찾는 중"/"홈"으로 되돌아가게 match_canceled 부터 보낸다.
    this.server.to(aliveSocketId).emit(GAME_MATCH_CANCELED_EVENT);

    if (pending.mode === 'friend') {
      // daeunki2 : 상태변화 추가
      // 친구 초대 pending 취소 시 남은 사용자도 MATCHING 종료로 정리
      await this.gameRedis.publishPresence(aliveUserId, 'matching_ended');
      // suna : 친구매치는 큐 복귀 없음. 살아남은 쪽도 모달이 닫히고 "친구가 거절" 알림이 뜨도록 queue_error 발행.
      // 프론트 Provider 가 queueError 를 받으면 closeMatchModal 호출 + i18n alert 표시.
      this.server.to(aliveSocketId).emit('queue_error', {
        code: 'INVITE_TARGET_LEFT',
        message: 'Friend declined or disconnected.',
      });
      console.log(`[Game] friend match canceled: leaver=${leaverUserId} survivor=${aliveUserId}`);
      return;
    }

    console.log(
      `[Game] pending 단계 이탈(queue): leaver=${leaverUserId} survivor=${aliveUserId} -> 큐 복귀`,
    );

    // 살아남은 쪽을 큐로 복귀. 큐에 이미 누가 있으면 즉시 매칭될 수 있으므로 결과를 받아 prepareMatch 까지 연결.
    const nextMatch = await this.matchmaking.enqueue(
      aliveUserId,
      aliveSocketId,
      isGuest,
      this.server,
    );
    if (nextMatch) {
      this.gameRuntime.prepareMatch(nextMatch, isGuest, 'queue');
    }
  }

  // ai용 추가
  @SubscribeMessage('start_ai_game')
  async onStartAiGame(client: Socket, payload: { gameType?: string }) {
    await this.gameAiHelper.startAiGame(client, payload?.gameType ?? '');
  }

  // @SubscribeMessage('join_queue')
  // daeunki2 주석처리 : 이벤트명을 직접 문자열로 쓰면 상수와 불일치할 수 있어 아래 GAME_JOIN_QUEUE_EVENT를 사용한다.
  @SubscribeMessage(GAME_JOIN_QUEUE_EVENT)
  async onJoinQueue(client: Socket) {
    const userId: string | undefined = client.data.userId;
    const isGuest: boolean = Boolean(client.data.isGuest);
    if (!userId) {
      // 이유: message 는 영어 fallback 만 두고, 실제 표시 문구는 프론트가 code 로 i18n 룩업한다.
      client.emit('queue_error', { code: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return;
    }

    // 이유: 이미 진행 중인 게임이 있다면 새 매칭 금지 (중복 매칭 방지).
    const existing = await this.gameRedis.getUserGameId(userId);
    if (existing) {
      client.emit('queue_error', {
        code: 'ALREADY_IN_GAME',
        message: 'You are already in an ongoing game.',
        gameId: existing,
      });
      return;
    }

    console.log(`[Game] join_queue: userId=${userId} isGuest=${isGuest}`);
    // await this.matchmaking.enqueue(userId, client.id, isGuest, this.server); >> 매창까지만 하는 로직
    const match = await this.matchmaking.enqueue(userId, client.id, isGuest, this.server);
    if (match) {
        // suna : 매칭 직후 바로 게임 루프를 돌리지 않고 양쪽 ready 핸드셰이크 대기 상태로 진입.
        this.gameRuntime.prepareMatch(match, isGuest, 'queue');
    } // daeunki2 :  매칭이 존재하면 게임 시작하게 수정
  }

}
