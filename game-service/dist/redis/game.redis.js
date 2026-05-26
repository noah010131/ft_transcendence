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
exports.GameRedis = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const crypto_1 = require("crypto");
const presence_types_1 = require("../types/presence.types");
const game_engine_constants_1 = require("../engine/game-engine.constants");
let GameRedis = class GameRedis {
    queueKey(isGuest) {
        return isGuest ? 'game:queue:guest' : 'game:queue:user';
    }
    constructor(configService) {
        this.configService = configService;
        this.LOCK_KEY = 'game:match:lock';
        this.LOCK_TTL_SEC = 5;
        const host = this.configService.get('REDIS_HOST') ?? 'redis';
        const port = Number(this.configService.get('REDIS_PORT') ?? 6379);
        this.client = new ioredis_1.default({ host, port });
        this.pub = new ioredis_1.default({ host, port });
    }
    async enqueue(userId, socketId, isGuest) {
        const queue = this.queueKey(isGuest);
        const otherQueue = this.queueKey(!isGuest);
        await this.client.lrem(queue, 0, userId);
        await this.client.lrem(otherQueue, 0, userId);
        await this.client.rpush(queue, userId);
        await this.client.set(this.socketKey(userId), socketId);
    }
    async removeFromQueue(userId, isGuest) {
        const removed = await this.client.lrem(this.queueKey(isGuest), 0, userId);
        await this.client.del(this.socketKey(userId));
        return removed;
    }
    async queueLength(isGuest) {
        return this.client.llen(this.queueKey(isGuest));
    }
    async popTwo(isGuest) {
        const result = (await this.client.lpop(this.queueKey(isGuest), 2));
        return result ?? [];
    }
    async pushBackToFront(userId, socketId, isGuest) {
        if (socketId) {
            await this.client.set(this.socketKey(userId), socketId);
        }
        await this.client.lpush(this.queueKey(isGuest), userId);
    }
    async getQueueSocketId(userId) {
        return this.client.get(this.socketKey(userId));
    }
    async clearQueueSocket(userId) {
        await this.client.del(this.socketKey(userId));
    }
    async acquireMatchLock() {
        const token = (0, crypto_1.randomUUID)();
        const ok = await this.client.set(this.LOCK_KEY, token, 'EX', this.LOCK_TTL_SEC, 'NX');
        return ok === 'OK' ? token : null;
    }
    async releaseMatchLock(token) {
        const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
        await this.client.eval(script, 1, this.LOCK_KEY, token);
    }
    async createSession(p1, p2) {
        const gameId = (0, crypto_1.randomUUID)();
        const session = {
            gameId,
            p1,
            p2,
            state: 'waiting',
            createdAt: new Date().toISOString(),
        };
        await this.client.hset(this.sessionKey(gameId), session);
        await this.client.set(this.userGameKey(p1), gameId);
        await this.client.set(this.userGameKey(p2), gameId);
        return session;
    }
    async getSession(gameId) {
        const raw = await this.client.hgetall(this.sessionKey(gameId));
        if (!raw || Object.keys(raw).length === 0)
            return null;
        return raw;
    }
    async getUserGameId(userId) {
        return this.client.get(this.userGameKey(userId));
    }
    async deleteSession(gameId) {
        const session = await this.getSession(gameId);
        await this.client.del(this.sessionKey(gameId));
        if (session) {
            await this.client.del(this.userGameKey(session.p1));
            await this.client.del(this.userGameKey(session.p2));
        }
    }
    async publishInviteWakeup(targetUserId, inviterUserId, inviterNickname) {
        const payload = {
            targetUserId,
            inviterUserId,
            inviterNickname,
            at: new Date().toISOString(),
        };
        await this.pub.publish(game_engine_constants_1.GAME_INVITE_WAKEUP_CHANNEL, JSON.stringify(payload));
    }
    async publishPresence(userId, type) {
        const seq = await this.pub.incr(`presence:seq:game-service:${userId}`);
        const event = {
            eventId: (0, crypto_1.randomUUID)(),
            userId,
            type,
            source: 'game-service',
            seq,
            at: new Date().toISOString(),
            version: 1,
        };
        await this.pub.publish(presence_types_1.PRESENCE_RAW_CHANNEL, JSON.stringify(event));
    }
    async onModuleDestroy() {
        await Promise.all([this.client.quit(), this.pub.quit()]);
    }
    socketKey(userId) {
        return `game:queue:socket:${userId}`;
    }
    sessionKey(gameId) {
        return `game:session:${gameId}`;
    }
    userGameKey(userId) {
        return `game:user:${userId}`;
    }
};
exports.GameRedis = GameRedis;
exports.GameRedis = GameRedis = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GameRedis);
//# sourceMappingURL=game.redis.js.map