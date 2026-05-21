import { Injectable, Logger } from '@nestjs/common';
import { Namespace } from 'socket.io';
import { GameRedis, GameSession } from '../redis/game.redis';

export interface MatchResult {
  session: GameSession;
  p1SocketId: string;
  p2SocketId: string;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(private readonly gameRedis: GameRedis) {}

  // 이유: join_queue 수신 시 호출. 큐에 추가하고 presence를 matching으로 올린 뒤 즉시 매칭 시도.
  // isGuest는 게스트끼리 / 회원끼리 분리 매칭을 위해 사용.
  async enqueue(
    userId: string,
    socketId: string,
    isGuest: boolean,
    server: Namespace,
  ): Promise<MatchResult | null> {
    await this.gameRedis.enqueue(userId, socketId, isGuest);
    await this.gameRedis.publishPresence(userId, 'matching_started');
    this.logger.log(`enqueue userId=${userId} socketId=${socketId} isGuest=${isGuest}`);
    return this.tryMatch(isGuest, server);
  }

  // 이유: leave_queue 또는 큐 대기 중 소켓 disconnect 시 호출.
  async dequeue(userId: string, isGuest: boolean): Promise<boolean> {
    const removed = await this.gameRedis.removeFromQueue(userId, isGuest);
    if (removed > 0) {
      await this.gameRedis.publishPresence(userId, 'matching_ended');
      this.logger.log(`dequeue userId=${userId} isGuest=${isGuest}`);
      return true;
    }
    return false;
  }

  // 이유: 큐(게스트/회원 중 하나)에 2명 이상일 때 원자적으로 둘을 뽑아 세션/룸을 만든다.
  // 잠금 실패 시 다른 워커가 처리 중이므로 그냥 종료.
  async tryMatch(isGuest: boolean, server: Namespace): Promise<MatchResult | null> {
    const len = await this.gameRedis.queueLength(isGuest);
    if (len < 2) return null;

    const lockToken = await this.gameRedis.acquireMatchLock();
    if (!lockToken) return null;

    try {
      // 잠금 획득 후 다시 길이 확인 (경합 방어)
      const recheck = await this.gameRedis.queueLength(isGuest);
      if (recheck < 2) return null;

      const popped = await this.gameRedis.popTwo(isGuest);
      if (popped.length < 2) {
        // 한 명만 뽑힌 경우 그대로 돌려놓고 종료
        for (const userId of popped) {
          const socketId = await this.gameRedis.getQueueSocketId(userId);
          await this.gameRedis.pushBackToFront(userId, socketId, isGuest);
        }
        return null;
      }

      const [userA, userB] = popped;

      // 이유: 큐에 있던 사이에 소켓이 끊겼을 수 있으므로 실제 살아있는지 확인.
      const aliveA = await this.verifyAlive(userA, server);
      const aliveB = await this.verifyAlive(userB, server);

      if (!aliveA && !aliveB) {
        await Promise.all([
          this.gameRedis.publishPresence(userA, 'matching_ended'),
          this.gameRedis.publishPresence(userB, 'matching_ended'),
        ]);
        this.logger.warn(`매칭 실패: 두 유저 모두 disconnect (${userA}, ${userB})`);
        return null;
      }
      if (!aliveA) {
        await this.gameRedis.publishPresence(userA, 'matching_ended');
        const sockB = await this.gameRedis.getQueueSocketId(userB);
        await this.gameRedis.pushBackToFront(userB, sockB, isGuest);
        this.logger.warn(`매칭 실패: ${userA} disconnect, ${userB} 큐 복귀`);
        return null;
      }
      if (!aliveB) {
        await this.gameRedis.publishPresence(userB, 'matching_ended');
        const sockA = await this.gameRedis.getQueueSocketId(userA);
        await this.gameRedis.pushBackToFront(userA, sockA, isGuest);
        this.logger.warn(`매칭 실패: ${userB} disconnect, ${userA} 큐 복귀`);
        return null;
      }

      // 두 명 모두 alive → 세션 생성
      const p1SocketId = (await this.gameRedis.getQueueSocketId(userA))!;
      const p2SocketId = (await this.gameRedis.getQueueSocketId(userB))!;
      const session = await this.gameRedis.createSession(userA, userB);

      // 이유: 큐 메타(소켓ID) 정리. 세션 쪽으로 이관됐으므로 더 이상 필요 없음.
      await Promise.all([
        this.gameRedis.clearQueueSocket(userA),
        this.gameRedis.clearQueueSocket(userB),
      ]);

      // 이유: 네임스페이스 게이트웨이라 server는 사실 Namespace 인스턴스.
      // 직접 Socket 객체를 꺼내지 않고 socket.io v4 표준 API(in/to/socketsJoin)로 룸 join + 송신.
      const room = `game:${session.gameId}`;
      await server.in(p1SocketId).socketsJoin(room);
      await server.in(p2SocketId).socketsJoin(room);

      // opponent 필드를 userId 대신 nickname 으로 발행. 프론트 GameBoard 상단 표시에 그대로 사용됨.
      // socket.data.nickname 은 game.gateway.ts handleConnection 에서 extractNickname() 으로 세팅됨. 없으면 userId fallback.
      const p1Nickname = String(server.sockets.get(p1SocketId)?.data?.nickname ?? userA);
      const p2Nickname = String(server.sockets.get(p2SocketId)?.data?.nickname ?? userB);

      server.to(p1SocketId).emit('match_found', {
        gameId: session.gameId,
        side: 'p1',
        opponent: p2Nickname,
      });
      server.to(p2SocketId).emit('match_found', {
        gameId: session.gameId,
        side: 'p2',
        opponent: p1Nickname,
      });

      // 이유: presence는 matching → in_game으로 전이. gateway가 flags.matching=false, flags.inGame=true로 처리.
      // suna : game_started 는 ready 핸드셰이크 후 실제 게임 루프 시작 시점(GameRuntimeService.startMatch)으로 옮김.
      // 여기서는 매칭 큐에서 빠졌다는 사실만 알린다.
      await Promise.all([
        this.gameRedis.publishPresence(userA, 'matching_ended'),
        this.gameRedis.publishPresence(userB, 'matching_ended'),
      ]);

      this.logger.log(
        `매칭 성공 gameId=${session.gameId} isGuest=${isGuest} p1=${userA} p2=${userB}`,
      );
      return { session, p1SocketId, p2SocketId };
    } finally {
      await this.gameRedis.releaseMatchLock(lockToken);
    }
  }

  // 이유: namespace.fetchSockets()로 해당 socketId가 실제 연결돼 있는지 확인. cluster-safe.
  private async verifyAlive(userId: string, server: Namespace): Promise<boolean> {
    const socketId = await this.gameRedis.getQueueSocketId(userId);
    if (!socketId) return false;
    const sockets = await server.in(socketId).fetchSockets();
    return sockets.length > 0;
  }
}
