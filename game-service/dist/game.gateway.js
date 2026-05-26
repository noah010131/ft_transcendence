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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const matchmaking_service_1 = require("./matchmaking/matchmaking.service");
const friend_invite_service_1 = require("./matchmaking/friend-invite.service");
const game_redis_1 = require("./redis/game.redis");
const game_runtime_service_1 = require("./engine/game-runtime.service");
const game_ai_gateway_helper_1 = require("./game-ai.gateway.helper");
const game_engine_constants_1 = require("./engine/game-engine.constants");
const gameCorsOrigin = (() => {
    const raw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
    const list = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
    return list.length === 1 ? list[0] : list;
})();
let GameGateway = class GameGateway {
    constructor(matchmaking, gameRedis, gameRuntime, friendInvite, gameAiHelper) {
        this.matchmaking = matchmaking;
        this.gameRedis = gameRedis;
        this.gameRuntime = gameRuntime;
        this.friendInvite = friendInvite;
        this.gameAiHelper = gameAiHelper;
    }
    onMovePaddle(client, payload) {
        this.gameRuntime.movePaddle(client, payload);
    }
    async onReady(client) {
        const pendingAi = this.gameAiHelper.consumePendingForReady(client.id);
        if (pendingAi) {
            await this.gameRuntime.startMatch(pendingAi, this.server);
            return;
        }
        await this.gameRuntime.handleReady(client, this.server);
    }
    async onInviteFriend(client, payload) {
        const userId = client.data.userId;
        if (!userId) {
            client.emit('queue_error', { code: 'UNAUTHENTICATED', message: 'Authentication required.' });
            return;
        }
        const targetUserId = payload?.targetUserId;
        if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
            client.emit('queue_error', { code: 'INVALID_INVITE_TARGET', message: 'Invalid target user.' });
            return;
        }
        const rejectCode = await this.friendInvite.invite(this.server, {
            userId,
            socketId: client.id,
            isGuest: Boolean(client.data.isGuest),
            nickname: String(client.data.nickname ?? userId),
        }, targetUserId.trim());
        if (rejectCode) {
            client.emit('queue_error', {
                code: rejectCode,
                message: `Invite rejected: ${rejectCode}`,
            });
        }
    }
    extractUserId(client) {
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
    extractIsGuest(client) {
        const header = client.handshake.headers['x-is-guest'];
        if (typeof header === 'string')
            return header === 'true';
        if (Array.isArray(header))
            return header.includes('true');
        return false;
    }
    extractNickname(client) {
        const queryNickname = client.handshake.query.nickname;
        if (typeof queryNickname === 'string' && queryNickname.trim() !== '') {
            return queryNickname.trim();
        }
        return String(client.data.userId ?? '');
    }
    handleConnection(client) {
        const userId = this.extractUserId(client);
        if (!userId) {
            console.warn(`[Game] 인증 헤더 누락 -> 접속 거부 (socketId=${client.id})`);
            client.disconnect();
            return;
        }
        this.evictDuplicateSockets(userId, client.id);
        const isGuest = this.extractIsGuest(client);
        client.data.userId = userId;
        client.data.isGuest = isGuest;
        client.data.nickname = this.extractNickname(client);
        //console.log(`[Game] 연결 성공: userId=${userId}, isGuest=${isGuest}, socketId=${client.id}`);
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
    evictDuplicateSockets(userId, incomingSocketId) {
        for (const existing of this.server.sockets.values()) {
            if (existing.id === incomingSocketId)
                continue;
            if (existing.data?.userId !== userId)
                continue;
            console.warn(`[Game] 동일 userId 중복 연결 감지 → 기존 소켓 강제 종료: userId=${userId} oldSocketId=${existing.id} newSocketId=${incomingSocketId}`);
            existing.emit('queue_error', {
                code: 'KICKED_BY_NEW_TAB',
                message: 'Connection closed because a new session started in another tab.',
            });
            existing.disconnect();
        }
    }
    async handleDisconnect(client) {
        const userId = client.data.userId;
        const isGuest = Boolean(client.data.isGuest);
        if (!userId)
            return;
        //console.log(`[Game] 연결 종료: userId=${userId}, socketId=${client.id}`);
        await this.gameAiHelper.cleanupPendingAiMatch(client.id);
        await this.matchmaking.dequeue(userId, isGuest);
        this.friendInvite.cancelInvolvingUser(userId, this.server);
        const pendingResult = await this.gameRuntime.handlePendingDisconnect(client, this.server);
        if (pendingResult.wasPending) {
            await this.gameRedis.publishPresence(userId, 'matching_ended');
            await this.handleSurvivor(userId, pendingResult);
            return;
        }
        await this.gameRuntime.handleDisconnect(client, this.server);
    }
    async handleSurvivor(leaverUserId, pending) {
        if (!pending.alive) {
            //console.log(`[Game] pending 양쪽 모두 종료: leaver=${leaverUserId} mode=${pending.mode}`);
            return;
        }
        const { userId: aliveUserId, socketId: aliveSocketId, isGuest } = pending.alive;
        this.server.to(aliveSocketId).emit(game_engine_constants_1.GAME_MATCH_CANCELED_EVENT);
        if (pending.mode === 'friend') {
            await this.gameRedis.publishPresence(aliveUserId, 'matching_ended');
            this.server.to(aliveSocketId).emit('queue_error', {
                code: 'INVITE_TARGET_LEFT',
                message: 'Friend declined or disconnected.',
            });
            //console.log(`[Game] friend match canceled: leaver=${leaverUserId} survivor=${aliveUserId}`);
            return;
        }
        //console.log(`[Game] pending 단계 이탈(queue): leaver=${leaverUserId} survivor=${aliveUserId} -> 큐 복귀`);
        const nextMatch = await this.matchmaking.enqueue(aliveUserId, aliveSocketId, isGuest, this.server);
        if (nextMatch) {
            this.gameRuntime.prepareMatch(nextMatch, isGuest, 'queue');
        }
    }
    async onStartAiGame(client, payload) {
        await this.gameAiHelper.startAiGame(client, payload?.gameType ?? '');
    }
    async onJoinQueue(client) {
        const userId = client.data.userId;
        const isGuest = Boolean(client.data.isGuest);
        if (!userId) {
            client.emit('queue_error', { code: 'UNAUTHENTICATED', message: 'Authentication required.' });
            return;
        }
        const existing = await this.gameRedis.getUserGameId(userId);
        if (existing) {
            client.emit('queue_error', {
                code: 'ALREADY_IN_GAME',
                message: 'You are already in an ongoing game.',
                gameId: existing,
            });
            return;
        }
        //console.log(`[Game] join_queue: userId=${userId} isGuest=${isGuest}`);
        const match = await this.matchmaking.enqueue(userId, client.id, isGuest, this.server);
        if (match) {
            this.gameRuntime.prepareMatch(match, isGuest, 'queue');
        }
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Namespace)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_engine_constants_1.GAME_MOVE_PADDLE_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onMovePaddle", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_engine_constants_1.GAME_READY_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "onReady", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_engine_constants_1.GAME_INVITE_FRIEND_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "onInviteFriend", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('start_ai_game'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "onStartAiGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_engine_constants_1.GAME_JOIN_QUEUE_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "onJoinQueue", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'game',
        cors: {
            origin: gameCorsOrigin,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService,
        game_redis_1.GameRedis,
        game_runtime_service_1.GameRuntimeService,
        friend_invite_service_1.FriendInviteService,
        game_ai_gateway_helper_1.GameAiGatewayHelper])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map