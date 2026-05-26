import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Namespace, Socket } from 'socket.io';
import {
  GAME_OVER_EVENT,
  GAME_STATE_EVENT,
} from './game-engine.constants';
import type {
  EngineState,
  GameResult,
  GameState,
  MovePaddlePayload,
  PlayerSlot,
} from './game-engine.types';
import { GameEngineService } from './game-engine.service';
import { AiRuntimeAdapter } from './ai-runtime.adapter';
import { GameRecordEntity } from '../game-record.entity';
import type { MatchResult } from '../matchmaking/matchmaking.service';
import { GameRedis } from '../redis/game.redis';

type RuntimeGameSession = {
  gameId: string;
  p1SocketId: string;
  p2SocketId: string;
  p1UserId: string;
  p2UserId: string;
  p1Nickname: string;
  p2Nickname: string;
  isFinishing: boolean; // 게임 히스토리 1번만 저장하려고 추가
  state: EngineState;
  timer: NodeJS.Timeout;
};

// suna : match_found 직후 ~ 양쪽 ready 까지 머무는 단계의 상태.
// 양쪽 ready 가 모이면 startMatch 로 승격되어 RuntimeGameSession 으로 바뀐다.
// mode 는 'queue'(일반 매칭) 또는 'friend'(친구 초대). ESC 처리에서 큐 복귀 vs 양쪽 취소를 가른다.
type PendingMatch = {
  match: MatchResult;
  p1Ready: boolean;
  p2Ready: boolean;
  isGuest: boolean;
  mode: 'queue' | 'friend';
};

// suna : 한쪽이 ready 전에 ESC/연결 끊김으로 빠졌을 때, 남은 한쪽을 큐로 되돌리기 위해 필요한 정보.
export interface PendingMatchSurvivor {
  userId: string;
  socketId: string;
  isGuest: boolean;
}

@Injectable()
export class GameRuntimeService {
  // merge수정 : daeunki2가 Gateway 안에 급하게 넣었던 실행 중 게임 세션 저장소를 별도 서비스로 분리함.
  // key는 MatchmakingService/GameRedis가 만든 gameId이고, value는 실제 루프/점수/소켓 정보를 담는다.
  private readonly sessions = new Map<string, RuntimeGameSession>();

  // merge수정 : move_paddle/disconnect 이벤트는 socketId만 들고 들어오므로 socketId -> gameId 역인덱스를 둔다.
  private readonly socketToGameId = new Map<string, string>();

  // suna : ready 핸드셰이크 대기 중인 매치. 양쪽 ready 가 모이면 sessions 로 이동한다.
  private readonly pendingMatches = new Map<string, PendingMatch>();

  // suna : ready 이벤트/disconnect 는 socketId 만 들고 들어오므로 pending 단계 역인덱스도 둔다.
  private readonly socketToPendingGameId = new Map<string, string>();

  constructor(
    private readonly engine: GameEngineService,
    // daeunki2추가 : 추가한 사유
    // AI 매치일 때 p2 패들 입력을 자동 생성해 기존 엔진 루프에 주입한다.
    private readonly aiRuntimeAdapter: AiRuntimeAdapter,
    private readonly gameRedis: GameRedis,
    @InjectRepository(GameRecordEntity)
    private readonly gameRecordRepository: Repository<GameRecordEntity>,
  ) {}

  /**
   * suna : match_found 직후 호출하는 ready 대기 단계 진입점.
   *
   * 양쪽 모두 ready 를 보내기 전까지는 게임 루프를 돌리지 않는다.
   * Redis 게임 세션은 MatchmakingService 가 이미 만들어 둔 상태고, 이 단계에서
   * 한쪽이 연결을 끊으면 handlePendingDisconnect 가 세션을 정리하고 남은 한쪽을 큐로 복귀시킨다.
   */
  prepareMatch(match: MatchResult, isGuest: boolean, mode: 'queue' | 'friend' = 'queue'): void {
    const { session, p1SocketId, p2SocketId } = match;
    if (this.pendingMatches.has(session.gameId)) return;
    if (this.sessions.has(session.gameId)) return;

    this.pendingMatches.set(session.gameId, {
      match,
      p1Ready: false,
      p2Ready: false,
      isGuest,
      mode,
    });
    this.socketToPendingGameId.set(p1SocketId, session.gameId);
    this.socketToPendingGameId.set(p2SocketId, session.gameId);
  }

  /**
   * suna : 클라이언트의 ready 이벤트 처리.
   *
   * 자기 슬롯을 ready 로 표시하고, 양쪽 다 ready 면 pending 을 닫고 실제 게임 루프(startMatch)를 시작한다.
   */
  async handleReady(client: Socket, server: Namespace): Promise<void> {
    const gameId = this.socketToPendingGameId.get(client.id);
    if (!gameId) return;
    const pending = this.pendingMatches.get(gameId);
    if (!pending) {
      this.socketToPendingGameId.delete(client.id);
      return;
    }

    const { match } = pending;
    if (client.id === match.p1SocketId) {
      pending.p1Ready = true;
    } else if (client.id === match.p2SocketId) {
      pending.p2Ready = true;
    } else {
      return;
    }

    if (!(pending.p1Ready && pending.p2Ready)) return;

    // suna : 양쪽 ready 완료 -> pending 정리 후 게임 루프 시작.
    this.socketToPendingGameId.delete(match.p1SocketId);
    this.socketToPendingGameId.delete(match.p2SocketId);
    this.pendingMatches.delete(gameId);
    await this.startMatch(match, server);
  }

  /**
   * suna : pending 단계(ready 대기 중)에 한쪽이 끊겼을 때 호출.
   *
   * - Redis 의 게임 세션을 지운다(아직 게임은 시작 안 했으므로 통째로 폐기).
   * - 살아있는 상대에 대한 정보를 반환해, Gateway 가 다시 큐에 넣을 수 있게 한다.
   * - 반환값 alive 가 null 이면 상대도 이미 끊긴 상태라 큐 복귀 불필요.
   */
  async handlePendingDisconnect(
    client: Socket,
    server: Namespace,
  ): Promise<{
    wasPending: boolean;
    alive: PendingMatchSurvivor | null;
    isGuest: boolean;
    mode: 'queue' | 'friend' | null;
  }> {
    const gameId = this.socketToPendingGameId.get(client.id);
    if (!gameId) return { wasPending: false, alive: null, isGuest: false, mode: null };
    const pending = this.pendingMatches.get(gameId);
    if (!pending) {
      this.socketToPendingGameId.delete(client.id);
      return { wasPending: false, alive: null, isGuest: false, mode: null };
    }

    const { match, isGuest, mode } = pending;
    const isP1 = client.id === match.p1SocketId;
    const aliveSocketId = isP1 ? match.p2SocketId : match.p1SocketId;
    const aliveUserId = isP1 ? match.session.p2 : match.session.p1;

    // pending 상태/역인덱스 제거.
    this.socketToPendingGameId.delete(match.p1SocketId);
    this.socketToPendingGameId.delete(match.p2SocketId);
    this.pendingMatches.delete(gameId);

    // 게임이 실제로 시작되지 않았으므로 세션과 user->game 매핑 모두 삭제.
    await this.gameRedis.deleteSession(gameId);

    const aliveSocket = server.sockets.get(aliveSocketId);
    if (!aliveSocket) {
      return { wasPending: true, alive: null, isGuest, mode };
    }

    return {
      wasPending: true,
      alive: {
        userId: aliveUserId,
        socketId: aliveSocketId,
        isGuest: Boolean(aliveSocket.data.isGuest),
      },
      isGuest,
      mode,
    };
  }

  /**
   * merge수정 : main의 MatchmakingService가 매칭을 끝낸 뒤 호출할 게임 실행 시작점.
   *
   * 여기서는 매칭을 다시 하지 않는다.
   * MatchResult의 gameId, p1/p2 userId, p1/p2 socketId는 main 매칭 로직이 검증한 결과다.
   * Runtime은 그 결과를 받아 실제 Pong 루프만 시작한다.
   */
  async startMatch(match: MatchResult, server: Namespace): Promise<void> {
    // MatchmakingService가 만든 Redis GameSession과 양쪽 socketId를 그대로 사용한다.
    const { session, p1SocketId, p2SocketId } = match;

    // 같은 gameId로 startMatch가 중복 호출되어도 루프가 두 번 생기지 않도록 방어한다.
    if (this.sessions.has(session.gameId)) {
      return;
    }

    // 매칭 직후라도 socket이 끊겼을 수 있으므로 Namespace의 socket map에서 다시 확인한다.
    const p1Socket = server.sockets.get(p1SocketId);
    const p2Socket = server.sockets.get(p2SocketId);
    if (!p1Socket || !p2Socket) {
      // merge수정 : 매칭은 성공했지만 런타임 시작 전에 소켓이 사라진 예외 상황.
      // Redis 게임 세션을 정리하지 않으면 다음 매칭에서 ALREADY_IN_GAME에 계속 걸린다.
      await this.gameRedis.deleteSession(session.gameId);
      await Promise.all([
        this.gameRedis.publishPresence(session.p1, 'game_ended'),
        this.gameRedis.publishPresence(session.p2, 'game_ended'),
      ]);
      return;
    }

    // 실제 게임 루프가 사용할 런타임 세션을 만든다.
    // Redis 세션은 매칭/중복 게임 체크용이고, 이 객체는 실시간 게임 진행용이다.
    const runtimeSession: RuntimeGameSession = {
      gameId: session.gameId,
      p1SocketId,
      p2SocketId,
      p1UserId: session.p1,
      p2UserId: session.p2,
      p1Nickname: this.getSocketNickname(p1Socket, session.p1),
      p2Nickname: this.isAiUserId(session.p2)
        ? 'AI_BOT'
        : this.getSocketNickname(p2Socket, session.p2),
      isFinishing: false,
      state: this.engine.createInitialState(),
      timer: setInterval(() => this.tick(session.gameId, server), 1000 / 60),
    };

    // gameId로 실행 중 세션을 찾을 수 있게 저장한다.
    this.sessions.set(session.gameId, runtimeSession);

    // move_paddle/disconnect는 socketId만 들고 들어오므로 역방향 조회 테이블을 만든다.
    this.socketToGameId.set(p1SocketId, session.gameId);
    this.socketToGameId.set(p2SocketId, session.gameId);

    // suna : 실제 게임 루프 시작 시점에 presence 를 in_game 으로 전이한다.
    await Promise.all([
      this.gameRedis.publishPresence(session.p1, 'game_started'),
      this.gameRedis.publishPresence(session.p2, 'game_started'),
    ]);
  }

  /**
   * merge수정 : 클라이언트의 move_paddle 이벤트를 실제 엔진 상태에 반영한다.
   *
   * 현재 계약:
   * - 프론트가 키를 누르고 있는 동안 move_paddle을 반복 전송한다.
   * - 서버는 이벤트 1번당 패들을 한 스텝 움직인다.
   */
  movePaddle(client: Socket, payload: MovePaddlePayload): void {
    // 잘못된 payload는 엔진에 넘기지 않는다.
    if (payload.direction !== 'up' && payload.direction !== 'down') {
      return;
    }

    // socketId로 현재 소켓이 속한 게임을 찾는다.
    const gameId = this.socketToGameId.get(client.id);
    if (!gameId) return;

    // gameId로 실제 런타임 세션을 가져온다.
    const session = this.sessions.get(gameId);
    if (!session) return;

    // 이 socket이 p1인지 p2인지 판별한다. 알 수 없는 소켓이면 입력을 무시한다.
    const player = this.getPlayerSlotBySocket(session, client.id);
    if (!player) return;

    // 순수 물리 계산은 GameEngineService에 맡긴다.
    session.state = this.engine.movePaddle(session.state, player, payload.direction);
  }

  /**
   * merge수정 : 게임 중 소켓이 끊기면 현재 초안에서는 즉시 기권 처리한다.
   *
   * 프론트 소켓을 Provider로 올려 페이지 전환 시 끊기지 않게 만든다는 전제에서 자연스러운 정책이다.
   * 재연결을 허용하는 구조로 바꾸고 싶으면 이 메서드에 유예 타이머를 추가하면 된다.
   */
  async handleDisconnect(client: Socket, server: Namespace): Promise<void> {
    // 게임 중인 소켓이 아니면 Runtime에서 처리할 것이 없다.
    const gameId = this.socketToGameId.get(client.id);
    if (!gameId) return;

    // 역인덱스는 있는데 세션이 없으면 찌꺼기이므로 역인덱스만 정리한다.
    const session = this.sessions.get(gameId);
    if (!session) {
      this.socketToGameId.delete(client.id);
      return;
    }
    if (session.isFinishing) return;

    // 끊긴 소켓이 p1/p2 중 누구인지 확인한다.
    const disconnectedPlayer = this.getPlayerSlotBySocket(session, client.id);
    if (!disconnectedPlayer) return;

    // 기권 정책: 끊긴 플레이어의 상대가 승자다.
    const winnerId = disconnectedPlayer === 'p1'
      ? session.p2UserId
      : session.p1UserId;

    // game_over payload는 프론트 GameResult 타입에 맞춘다.
    const result: GameResult = {
      winnerId,
      score1: session.state.score1,
      score2: session.state.score2,
    };

    session.isFinishing = true;
    await this.finishGame(session, server, result, 'forfeit');
  }

  /**
   * merge수정 : setInterval에서 호출되는 한 프레임의 실행 단위.
   *
   * 1. GameEngineService로 물리 상태를 한 tick 갱신
   * 2. 프론트가 기대하는 game_state payload만 잘라 emit
   * 3. 승리 조건을 검사하고 끝났으면 game_over/DB저장/정리를 수행
   */
  private tick(gameId: string, server: Namespace): void {
    // 이미 종료된 세션이면 interval callback이 한 번 더 들어와도 무시한다.
    const session = this.sessions.get(gameId);
    if (!session) return;

    // 점수 변경 로그를 위해 이전 점수를 저장한다.
    const prevScore1 = session.state.score1;
    const prevScore2 = session.state.score2;

    // daeunki2추가 : 추가한 사유
    // AI 매치면 updateTick 전에 p2 패들 이동 입력을 1틱 반영한다.
    session.state = this.aiRuntimeAdapter.applyAiInputIfNeeded(
      session.state,
      session.p2UserId,
    );

    // 공 이동/벽 충돌/패들 충돌/득점 처리는 엔진에 위임한다.
    session.state = this.engine.updateTick(session.state);

    // 점수가 바뀐 순간만 로그를 남겨 디버깅 노이즈를 줄인다.
    if (
      session.state.score1 !== prevScore1 ||
      session.state.score2 !== prevScore2
    ) {
      console.log(
        `[Game] score changed: gameId=${gameId} ${prevScore1}:${prevScore2} -> ${session.state.score1}:${session.state.score2}`,
      );
    }

    // 현재 게임판 스냅샷을 양쪽 클라이언트에 보낸다.
    this.emitGameState(session, server);

    // 누군가 승리 점수에 도달했는지 확인한다.
    const result = this.engine.getGameResultIfOver(
      session.state,
      session.p1UserId,
      session.p2UserId,
    );
    if (!result) return;
    if (session.isFinishing) return;

    // 정상 종료: game_over -> DB 저장 -> 세션 정리.
    session.isFinishing = true;
    void this.finishGame(session, server, result, 'normal');
  }

  /**
   * 현재 게임판 상태를 프론트 렌더링용 payload로 변환해 보낸다.
   *
   * EngineState에는 ballVx/ballVy도 있지만 프론트 화면에는 필요 없으므로
   * GameState 타입의 6개 필드만 잘라 보낸다.
   */
  private emitGameState(session: RuntimeGameSession, server: Namespace): void {
    // 프론트 GameBoard가 바로 그릴 수 있는 좌표/점수 스냅샷.
    const payload: GameState = {
      ballX: session.state.ballX,
      ballY: session.state.ballY,
      p1Y: session.state.p1Y,
      p2Y: session.state.p2Y,
      score1: session.state.score1,
      score2: session.state.score2,
    };

    // daeunki2추가 : 추가한 사유
    // AI 매치에서 p1/p2가 동일 socketId를 가질 수 있어 중복 emit을 방지하기 위해 dedup 전송한다.
    const targets = new Set<string>([session.p1SocketId, session.p2SocketId]);
    for (const socketId of targets) {
      server.to(socketId).emit(GAME_STATE_EVENT, payload);
    }
  }

  /**
   * 게임 종료 이벤트를 양쪽 플레이어에게 보낸다.
   *
   * 정상 종료와 기권 종료 모두 같은 GameResult payload를 사용한다.
   */
  private emitGameOver(
    session: RuntimeGameSession,
    server: Namespace,
    result: GameResult,
  ): void {
    // daeunki2추가 : 추가한 사유
    // AI 매치의 동일 socketId 케이스에서 game_over 중복 수신을 막기 위해 dedup 전송한다.
    const targets = new Set<string>([session.p1SocketId, session.p2SocketId]);
    for (const socketId of targets) {
      server.to(socketId).emit(GAME_OVER_EVENT, result);
    }
  }

  /**
   * game_over emit, DB 저장, 세션 정리를 순서대로 수행하는 공통 종료 루틴.
   *
   * tick()과 disconnect()가 같은 종료 과정을 사용해야 기록/Redis 정리가 어긋나지 않는다.
   */
  private async finishGame(
    session: RuntimeGameSession,
    server: Namespace,
    result: GameResult,
    endedReason: 'normal' | 'forfeit',
  ): Promise<void> {
    const live = this.sessions.get(session.gameId);
    if (!live) return;
    if (!live.isFinishing) {
      live.isFinishing = true;
    }
    this.emitGameOver(session, server, result);
    await this.saveGameRecord(session, result.winnerId, endedReason);
    await this.endSession(session.gameId);
  }

  /**
   * merge수정 : 정상 종료/기권 종료 공통 정리.
   *
   * main 매칭 로직은 Redis에 game:user:{userId}를 기록한다.
   * 이 값을 지우지 않으면 게임이 끝난 뒤에도 ALREADY_IN_GAME으로 막히므로
   * Runtime 종료 시 반드시 GameRedis.deleteSession(gameId)를 호출한다.
   */
  private async endSession(gameId: string): Promise<void> {
    // 이미 정리된 게임이면 아무것도 하지 않는다.
    const session = this.sessions.get(gameId);
    if (!session) return;

    // 게임 루프를 멈추지 않으면 종료 후에도 tick이 계속 돌아 메모리/CPU 누수가 생긴다.
    clearInterval(session.timer);

    // socketId 역인덱스와 런타임 세션을 제거한다.
    this.socketToGameId.delete(session.p1SocketId);
    this.socketToGameId.delete(session.p2SocketId);
    this.sessions.delete(gameId);

    // merge수정 : game_started는 MatchmakingService가 이미 발행하므로 Runtime은 종료 이벤트만 발행한다.
    // Redis game session도 같이 지워야 다음 매칭에서 ALREADY_IN_GAME에 걸리지 않는다.
    await Promise.all([
      this.gameRedis.publishPresence(session.p1UserId, 'game_ended'),
      this.gameRedis.publishPresence(session.p2UserId, 'game_ended'),
      this.gameRedis.deleteSession(gameId),
    ]);
  }

  private async saveGameRecord(
    session: RuntimeGameSession,
    winnerId: string,
    endedReason: 'normal' | 'forfeit',
  ): Promise<void> {
    // winnerId 기준으로 winner/loser id와 nickname을 계산한다.
    const winnerIsP1 = winnerId === session.p1UserId;
    const loserId = winnerIsP1 ? session.p2UserId : session.p1UserId;
    const winnerNickname = winnerIsP1 ? session.p1Nickname : session.p2Nickname;
    const loserNickname = winnerIsP1 ? session.p2Nickname : session.p1Nickname;

    try {
      // game_records 테이블에 최종 결과를 저장한다.
      // 조회 서비스는 이 레코드를 winner/loser 중심 응답으로 다시 가공한다.
      await this.gameRecordRepository.save({
        gameId: session.gameId,
        player1Id: session.p1UserId,
        player2Id: session.p2UserId,
        winnerId,
        loserId,
        winnerNickname,
        loserNickname,
        player1Score: session.state.score1,
        player2Score: session.state.score2,
        endedReason,
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === '23505') {
        console.warn(
          `[Game] duplicate game record ignored: gameId=${session.gameId}, reason=${endedReason}`,
        );
        return;
      }
      // 기록 저장 실패가 게임 종료 정리를 막으면 안 되므로 로그만 남긴다.
      console.warn(
        `[Game] game record save failed: gameId=${session.gameId}, reason=${endedReason}`,
        error,
      );
    }
  }

  /**
   * 소켓에 저장된 nickname을 꺼낸다.
   *
   * Gateway가 nickname을 client.data에 넣어주면 그 값을 쓰고,
   * 아직 연결되지 않은 경우에는 userId를 fallback으로 저장한다.
   */
  private getSocketNickname(client: Socket, fallback: string): string {
    const nickname = client.data.nickname;
    return typeof nickname === 'string' && nickname.trim() !== ''
      ? nickname
      : fallback;
  }

  private isAiUserId(userId: string): boolean {
    return userId.startsWith('AI_BOT_');
  }

  /**
   * socketId가 현재 세션의 p1/p2 중 누구인지 판별한다.
   *
   * move_paddle과 disconnect는 socketId 기준으로 들어오므로
   * 이 헬퍼가 있어야 엔진에 넘길 PlayerSlot을 결정할 수 있다.
   */
  private getPlayerSlotBySocket(
    session: RuntimeGameSession,
    socketId: string,
  ): PlayerSlot | null {
    if (session.p1SocketId === socketId) return 'p1';
    if (session.p2SocketId === socketId) return 'p2';
    return null;
  }
}
