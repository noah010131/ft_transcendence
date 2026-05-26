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
exports.GameAiGatewayHelper = void 0;
const common_1 = require("@nestjs/common");
const game_redis_1 = require("./redis/game.redis");
let GameAiGatewayHelper = class GameAiGatewayHelper {
    constructor(gameRedis) {
        this.gameRedis = gameRedis;
        this.pendingAiMatches = new Map();
    }
    async startAiGame(client, gameType) {
        if (gameType !== 'ai') {
            client.emit('queue_error', {
                code: 'INVALID_GAME_TYPE',
                message: 'AI game start requires gameType=ai.',
            });
            return;
        }
        const pending = await this.createAiMatchForSocket(client);
        if (!pending)
            return;
        this.pendingAiMatches.set(client.id, pending);
    }
    consumePendingForReady(socketId) {
        const pending = this.pendingAiMatches.get(socketId);
        if (!pending)
            return null;
        this.pendingAiMatches.delete(socketId);
        return pending;
    }
    async cleanupPendingAiMatch(socketId) {
        const pending = this.pendingAiMatches.get(socketId);
        if (!pending)
            return;
        this.pendingAiMatches.delete(socketId);
        await this.gameRedis.deleteSession(pending.session.gameId);
        console.log(`[Game][AI] pending session cleaned before ready socketId=${socketId} gameId=${pending.session.gameId}`);
    }
    async createAiMatchForSocket(client) {
        const userId = client.data.userId;
        const isGuest = Boolean(client.data.isGuest);
        const nickname = String(client.data.nickname ?? userId ?? 'PLAYER');
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
        const aiUserId = `AI_BOT_${userId}`;
        const session = await this.gameRedis.createSession(userId, aiUserId);
        const gameId = session.gameId;
        const side = 'p1';
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
        client.once('disconnect', () => {
            void this.cleanupPendingAiMatch(client.id);
        });
        console.log(`[Game][AI] ai match prepared userId=${userId} socketId=${client.id} gameId=${gameId}`);
        return {
            session,
            p1SocketId: client.id,
            p2SocketId: client.id,
        };
    }
};
exports.GameAiGatewayHelper = GameAiGatewayHelper;
exports.GameAiGatewayHelper = GameAiGatewayHelper = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_redis_1.GameRedis])
], GameAiGatewayHelper);
//# sourceMappingURL=game-ai.gateway.helper.js.map