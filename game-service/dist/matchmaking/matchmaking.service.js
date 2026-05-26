"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const game_redis_1 = require("../redis/game.redis");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    constructor(gameRedis) {
        this.gameRedis = gameRedis;
        this.logger = new common_1.Logger(MatchmakingService_1.name);
    }
    async enqueue(userId, socketId, isGuest, server) {
        await this.gameRedis.enqueue(userId, socketId, isGuest);
        await this.gameRedis.publishPresence(userId, 'matching_started');
        this.logger.log(`enqueue userId=${userId} socketId=${socketId} isGuest=${isGuest}`);
        return this.tryMatch(isGuest, server);
    }
    async dequeue(userId, isGuest) {
        const removed = await this.gameRedis.removeFromQueue(userId, isGuest);
        if (removed > 0) {
            await this.gameRedis.publishPresence(userId, 'matching_ended');
            this.logger.log(`dequeue userId=${userId} isGuest=${isGuest}`);
            return true;
        }
        return false;
    }
    async tryMatch(isGuest, server) {
        const len = await this.gameRedis.queueLength(isGuest);
        if (len < 2)
            return null;
        const lockToken = await this.gameRedis.acquireMatchLock();
        if (!lockToken)
            return null;
        try {
            const recheck = await this.gameRedis.queueLength(isGuest);
            if (recheck < 2)
                return null;
            const popped = await this.gameRedis.popTwo(isGuest);
            if (popped.length < 2) {
                for (const userId of popped) {
                    const socketId = await this.gameRedis.getQueueSocketId(userId);
                    await this.gameRedis.pushBackToFront(userId, socketId, isGuest);
                }
                return null;
            }
            const [userA, userB] = popped;
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
            const p1SocketId = (await this.gameRedis.getQueueSocketId(userA));
            const p2SocketId = (await this.gameRedis.getQueueSocketId(userB));
            const session = await this.gameRedis.createSession(userA, userB);
            await Promise.all([
                this.gameRedis.clearQueueSocket(userA),
                this.gameRedis.clearQueueSocket(userB),
            ]);
            const room = `game:${session.gameId}`;
            await server.in(p1SocketId).socketsJoin(room);
            await server.in(p2SocketId).socketsJoin(room);
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
            await Promise.all([
                this.gameRedis.publishPresence(userA, 'matching_ended'),
                this.gameRedis.publishPresence(userB, 'matching_ended'),
            ]);
            this.logger.log(`매칭 성공 gameId=${session.gameId} isGuest=${isGuest} p1=${userA} p2=${userB}`);
            return { session, p1SocketId, p2SocketId };
        }
        finally {
            await this.gameRedis.releaseMatchLock(lockToken);
        }
    }
    async verifyAlive(userId, server) {
        const socketId = await this.gameRedis.getQueueSocketId(userId);
        if (!socketId)
            return false;
        const sockets = await server.in(socketId).fetchSockets();
        return sockets.length > 0;
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_redis_1.GameRedis])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map