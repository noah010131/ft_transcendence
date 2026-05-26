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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRuntimeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const game_engine_constants_1 = require("./game-engine.constants");
const game_engine_service_1 = require("./game-engine.service");
const ai_runtime_adapter_1 = require("./ai-runtime.adapter");
const game_record_entity_1 = require("../game-record.entity");
const game_redis_1 = require("../redis/game.redis");
let GameRuntimeService = class GameRuntimeService {
    constructor(engine, aiRuntimeAdapter, gameRedis, gameRecordRepository) {
        this.engine = engine;
        this.aiRuntimeAdapter = aiRuntimeAdapter;
        this.gameRedis = gameRedis;
        this.gameRecordRepository = gameRecordRepository;
        this.sessions = new Map();
        this.socketToGameId = new Map();
        this.pendingMatches = new Map();
        this.socketToPendingGameId = new Map();
    }
    prepareMatch(match, isGuest, mode = 'queue') {
        const { session, p1SocketId, p2SocketId } = match;
        if (this.pendingMatches.has(session.gameId))
            return;
        if (this.sessions.has(session.gameId))
            return;
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
    async handleReady(client, server) {
        const gameId = this.socketToPendingGameId.get(client.id);
        if (!gameId)
            return;
        const pending = this.pendingMatches.get(gameId);
        if (!pending) {
            this.socketToPendingGameId.delete(client.id);
            return;
        }
        const { match } = pending;
        if (client.id === match.p1SocketId) {
            pending.p1Ready = true;
        }
        else if (client.id === match.p2SocketId) {
            pending.p2Ready = true;
        }
        else {
            return;
        }
        if (!(pending.p1Ready && pending.p2Ready))
            return;
        this.socketToPendingGameId.delete(match.p1SocketId);
        this.socketToPendingGameId.delete(match.p2SocketId);
        this.pendingMatches.delete(gameId);
        await this.startMatch(match, server);
    }
    async handlePendingDisconnect(client, server) {
        const gameId = this.socketToPendingGameId.get(client.id);
        if (!gameId)
            return { wasPending: false, alive: null, isGuest: false, mode: null };
        const pending = this.pendingMatches.get(gameId);
        if (!pending) {
            this.socketToPendingGameId.delete(client.id);
            return { wasPending: false, alive: null, isGuest: false, mode: null };
        }
        const { match, isGuest, mode } = pending;
        const isP1 = client.id === match.p1SocketId;
        const aliveSocketId = isP1 ? match.p2SocketId : match.p1SocketId;
        const aliveUserId = isP1 ? match.session.p2 : match.session.p1;
        this.socketToPendingGameId.delete(match.p1SocketId);
        this.socketToPendingGameId.delete(match.p2SocketId);
        this.pendingMatches.delete(gameId);
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
    async startMatch(match, server) {
        const { session, p1SocketId, p2SocketId } = match;
        if (this.sessions.has(session.gameId)) {
            return;
        }
        const p1Socket = server.sockets.get(p1SocketId);
        const p2Socket = server.sockets.get(p2SocketId);
        if (!p1Socket || !p2Socket) {
            await this.gameRedis.deleteSession(session.gameId);
            await Promise.all([
                this.gameRedis.publishPresence(session.p1, 'game_ended'),
                this.gameRedis.publishPresence(session.p2, 'game_ended'),
            ]);
            return;
        }
        const runtimeSession = {
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
        this.sessions.set(session.gameId, runtimeSession);
        this.socketToGameId.set(p1SocketId, session.gameId);
        this.socketToGameId.set(p2SocketId, session.gameId);
        await Promise.all([
            this.gameRedis.publishPresence(session.p1, 'game_started'),
            this.gameRedis.publishPresence(session.p2, 'game_started'),
        ]);
    }
    movePaddle(client, payload) {
        if (payload.direction !== 'up' && payload.direction !== 'down') {
            return;
        }
        const gameId = this.socketToGameId.get(client.id);
        if (!gameId)
            return;
        const session = this.sessions.get(gameId);
        if (!session)
            return;
        const player = this.getPlayerSlotBySocket(session, client.id);
        if (!player)
            return;
        session.state = this.engine.movePaddle(session.state, player, payload.direction);
    }
    async handleDisconnect(client, server) {
        const gameId = this.socketToGameId.get(client.id);
        if (!gameId)
            return;
        const session = this.sessions.get(gameId);
        if (!session) {
            this.socketToGameId.delete(client.id);
            return;
        }
        if (session.isFinishing)
            return;
        const disconnectedPlayer = this.getPlayerSlotBySocket(session, client.id);
        if (!disconnectedPlayer)
            return;
        const winnerId = disconnectedPlayer === 'p1'
            ? session.p2UserId
            : session.p1UserId;
        const result = {
            winnerId,
            score1: session.state.score1,
            score2: session.state.score2,
        };
        session.isFinishing = true;
        await this.finishGame(session, server, result, 'forfeit');
    }
    tick(gameId, server) {
        const session = this.sessions.get(gameId);
        if (!session)
            return;
        const prevScore1 = session.state.score1;
        const prevScore2 = session.state.score2;
        session.state = this.aiRuntimeAdapter.applyAiInputIfNeeded(session.state, session.p2UserId);
        session.state = this.engine.updateTick(session.state);
        if (session.state.score1 !== prevScore1 ||
            session.state.score2 !== prevScore2) {
            console.log(`[Game] score changed: gameId=${gameId} ${prevScore1}:${prevScore2} -> ${session.state.score1}:${session.state.score2}`);
        }
        this.emitGameState(session, server);
        const result = this.engine.getGameResultIfOver(session.state, session.p1UserId, session.p2UserId);
        if (!result)
            return;
        if (session.isFinishing)
            return;
        session.isFinishing = true;
        void this.finishGame(session, server, result, 'normal');
    }
    emitGameState(session, server) {
        const payload = {
            ballX: session.state.ballX,
            ballY: session.state.ballY,
            p1Y: session.state.p1Y,
            p2Y: session.state.p2Y,
            score1: session.state.score1,
            score2: session.state.score2,
        };
        const targets = new Set([session.p1SocketId, session.p2SocketId]);
        for (const socketId of targets) {
            server.to(socketId).emit(game_engine_constants_1.GAME_STATE_EVENT, payload);
        }
    }
    emitGameOver(session, server, result) {
        const targets = new Set([session.p1SocketId, session.p2SocketId]);
        for (const socketId of targets) {
            server.to(socketId).emit(game_engine_constants_1.GAME_OVER_EVENT, result);
        }
    }
    async finishGame(session, server, result, endedReason) {
        const live = this.sessions.get(session.gameId);
        if (!live)
            return;
        if (!live.isFinishing) {
            live.isFinishing = true;
        }
        this.emitGameOver(session, server, result);
        await this.saveGameRecord(session, result.winnerId, endedReason);
        await this.endSession(session.gameId);
    }
    async endSession(gameId) {
        const session = this.sessions.get(gameId);
        if (!session)
            return;
        clearInterval(session.timer);
        this.socketToGameId.delete(session.p1SocketId);
        this.socketToGameId.delete(session.p2SocketId);
        this.sessions.delete(gameId);
        await Promise.all([
            this.gameRedis.publishPresence(session.p1UserId, 'game_ended'),
            this.gameRedis.publishPresence(session.p2UserId, 'game_ended'),
            this.gameRedis.deleteSession(gameId),
        ]);
    }
    async saveGameRecord(session, winnerId, endedReason) {
        const winnerIsP1 = winnerId === session.p1UserId;
        const loserId = winnerIsP1 ? session.p2UserId : session.p1UserId;
        const winnerNickname = winnerIsP1 ? session.p1Nickname : session.p2Nickname;
        const loserNickname = winnerIsP1 ? session.p2Nickname : session.p1Nickname;
        try {
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
        }
        catch (error) {
            const code = error?.code;
            if (code === '23505') {
                console.warn(`[Game] duplicate game record ignored: gameId=${session.gameId}, reason=${endedReason}`);
                return;
            }
            console.warn(`[Game] game record save failed: gameId=${session.gameId}, reason=${endedReason}`, error);
        }
    }
    getSocketNickname(client, fallback) {
        const nickname = client.data.nickname;
        return typeof nickname === 'string' && nickname.trim() !== ''
            ? nickname
            : fallback;
    }
    isAiUserId(userId) {
        return userId.startsWith('AI_BOT_');
    }
    getPlayerSlotBySocket(session, socketId) {
        if (session.p1SocketId === socketId)
            return 'p1';
        if (session.p2SocketId === socketId)
            return 'p2';
        return null;
    }
};
exports.GameRuntimeService = GameRuntimeService;
exports.GameRuntimeService = GameRuntimeService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(game_record_entity_1.GameRecordEntity)),
    __metadata("design:paramtypes", [game_engine_service_1.GameEngineService,
        ai_runtime_adapter_1.AiRuntimeAdapter,
        game_redis_1.GameRedis,
        typeorm_2.Repository])
], GameRuntimeService);
//# sourceMappingURL=game-runtime.service.js.map