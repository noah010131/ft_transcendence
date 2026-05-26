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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceRedis = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let PresenceRedis = class PresenceRedis {
    configService;
    host;
    port;
    pub;
    sub;
    kv;
    constructor(configService) {
        this.configService = configService;
        this.host = this.configService.get('REDIS_HOST') ?? 'redis';
        this.port = Number(this.configService.get('REDIS_PORT') ?? 6379);
        this.pub = new ioredis_1.default({ host: this.host, port: this.port });
        this.sub = new ioredis_1.default({ host: this.host, port: this.port });
        this.kv = new ioredis_1.default({ host: this.host, port: this.port });
    }
    getPublisher() {
        return this.pub;
    }
    getSubscriber() {
        return this.sub;
    }
    createSubscriber() {
        return new ioredis_1.default({ host: this.host, port: this.port });
    }
    async addSocket(userId, socketId) {
        return this.kv.sadd(this.socketsKey(userId), socketId);
    }
    async removeSocket(userId, socketId) {
        return this.kv.srem(this.socketsKey(userId), socketId);
    }
    async getSocketCount(userId) {
        return this.kv.scard(this.socketsKey(userId));
    }
    async getSocketIds(userId) {
        return this.kv.smembers(this.socketsKey(userId));
    }
    async touchSocketAlive(userId, socketId, ttlSec) {
        await this.kv.set(this.socketAliveKey(userId, socketId), '1', 'EX', ttlSec);
    }
    async clearSocketAlive(userId, socketId) {
        await this.kv.del(this.socketAliveKey(userId, socketId));
    }
    async isSocketAlive(userId, socketId) {
        const exists = await this.kv.exists(this.socketAliveKey(userId, socketId));
        return exists === 1;
    }
    async getEffectiveState(userId) {
        const raw = await this.kv.get(this.effectiveKey(userId));
        if (raw === 'ONLINE' || raw === 'MATCHING' || raw === 'IN_GAME') {
            return raw;
        }
        return 'OFFLINE';
    }
    async setEffectiveState(userId, state) {
        await Promise.all([
            this.kv.set(this.effectiveKey(userId), state),
            this.kv.set(this.lastSeenKey(userId), new Date().toISOString()),
        ]);
    }
    async getFlags(userId) {
        const raw = await this.kv.get(this.flagsKey(userId));
        if (!raw)
            return { matching: false, inGame: false };
        try {
            const parsed = JSON.parse(raw);
            return {
                matching: Boolean(parsed.matching),
                inGame: Boolean(parsed.inGame),
            };
        }
        catch {
            return { matching: false, inGame: false };
        }
    }
    async setFlags(userId, flags) {
        await this.kv.set(this.flagsKey(userId), JSON.stringify(flags));
    }
    async getLastSequence(source, userId) {
        const raw = await this.kv.get(this.lastSeqKey(source, userId));
        return Number(raw ?? 0);
    }
    async setLastSequence(source, userId, seq) {
        await this.kv.set(this.lastSeqKey(source, userId), String(seq));
    }
    async getLastEventAt(source, userId) {
        const raw = await this.kv.get(this.lastEventAtKey(source, userId));
        if (!raw)
            return 0;
        const time = Date.parse(raw);
        return Number.isNaN(time) ? 0 : time;
    }
    async setLastEventAt(source, userId, at) {
        await this.kv.set(this.lastEventAtKey(source, userId), at);
    }
    async markEventProcessed(eventId, ttlSec = 120) {
        const result = await this.kv.set(this.eventDedupKey(eventId), '1', 'EX', ttlSec, 'NX');
        return result === 'OK';
    }
    async getUsersWithSockets() {
        const users = [];
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.kv.scan(cursor, 'MATCH', 'presence:sockets:*', 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const userId = key.slice('presence:sockets:'.length);
                if (!userId)
                    continue;
                const count = await this.kv.scard(key);
                if (count > 0) {
                    users.push(userId);
                }
            }
        } while (cursor !== '0');
        return users;
    }
    async getFriendIdsCache(userId) {
        const raw = await this.kv.get(this.friendIdsKey(userId));
        if (!raw)
            return null;
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return null;
            return parsed.filter((id) => typeof id === 'string' && id.length > 0);
        }
        catch {
            return null;
        }
    }
    async setFriendIdsCache(userId, friendIds, ttlSec = 60) {
        await this.kv.set(this.friendIdsKey(userId), JSON.stringify(friendIds), 'EX', ttlSec);
    }
    async invalidateFriendIdsCache(userIds) {
        if (userIds.length === 0)
            return;
        const keys = userIds.map((userId) => this.friendIdsKey(userId));
        await this.kv.del(...keys);
    }
    async onModuleDestroy() {
        await Promise.all([this.pub.quit(), this.sub.quit(), this.kv.quit()]);
    }
    socketsKey(userId) {
        return `presence:sockets:${userId}`;
    }
    socketAliveKey(userId, socketId) {
        return `presence:socketAlive:${userId}:${socketId}`;
    }
    effectiveKey(userId) {
        return `presence:effective:${userId}`;
    }
    flagsKey(userId) {
        return `presence:flags:${userId}`;
    }
    lastSeqKey(source, userId) {
        return `presence:lastSeq:${source}:${userId}`;
    }
    lastEventAtKey(source, userId) {
        return `presence:lastEventAt:${source}:${userId}`;
    }
    eventDedupKey(eventId) {
        return `presence:event:${eventId}`;
    }
    lastSeenKey(userId) {
        return `presence:lastSeen:${userId}`;
    }
    friendIdsKey(userId) {
        return `presence:friends:${userId}`;
    }
};
exports.PresenceRedis = PresenceRedis;
exports.PresenceRedis = PresenceRedis = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PresenceRedis);
//# sourceMappingURL=presence.redis.js.map