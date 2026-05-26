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
exports.PresenceService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const presence_types_1 = require("./presence.types");
const presence_redis_1 = require("./presence.redis");
let PresenceService = class PresenceService {
    redis;
    heartbeatTtlSec = 15;
    heartbeatSweepMs = 5000;
    heartbeatSweepTimer = null;
    constructor(redis) {
        this.redis = redis;
    }
    async publishRawEvent(event) {
        await this.redis.getPublisher().publish(presence_types_1.PRESENCE_RAW_CHANNEL, JSON.stringify(event));
    }
    async publishGatewayConnectionEvent(userId, type, socketId) {
        const seq = await this.redis.getPublisher().incr(`presence:seq:gateway:${userId}`);
        const event = {
            eventId: (0, crypto_1.randomUUID)(),
            userId,
            type,
            source: 'gateway',
            seq,
            at: new Date().toISOString(),
            version: 1,
            meta: { socketId },
        };
        await this.publishRawEvent(event);
    }
    async markHeartbeat(userId, socketId) {
        await this.redis.touchSocketAlive(userId, socketId, this.heartbeatTtlSec);
    }
    async startRawEventConsumer() {
        const sub = this.redis.getSubscriber();
        await sub.subscribe(presence_types_1.PRESENCE_RAW_CHANNEL);
        sub.on('message', async (channel, payload) => {
            if (channel !== presence_types_1.PRESENCE_RAW_CHANNEL)
                return;
            const event = this.parseEvent(payload);
            if (!event)
                return;
            await this.handleRawEvent(event);
        });
        //console.log('[presence] subscribed channel:', presence_types_1.PRESENCE_RAW_CHANNEL);
    }
    startHeartbeatReconciler() {
        if (this.heartbeatSweepTimer)
            return;
        this.heartbeatSweepTimer = setInterval(() => {
            void this.reconcileHeartbeatTimeouts();
        }, this.heartbeatSweepMs);
    }
    async getPresence(userId) {
        const internalStatus = await this.redis.getEffectiveState(userId);
        const connCount = await this.redis.getSocketCount(userId);
        const flags = await this.redis.getFlags(userId);
        return {
            userId,
            connCount,
            flags,
            internalStatus,
            publicStatus: this.toPublicStatus(internalStatus),
        };
    }
    async invalidateFriendCaches(userIds) {
        const normalized = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0)));
        await this.redis.invalidateFriendIdsCache(normalized);
    }
    async handleRawEvent(event) {
        const firstSeen = await this.redis.markEventProcessed(event.eventId);
        if (!firstSeen) {
            return;
        }
        if (!(await this.isEventFresh(event))) {
            return;
        }
        const prevStatus = await this.redis.getEffectiveState(event.userId);
        await this.applyEventToStorage(event);
        const nextStatus = await this.recomputeEffectiveStatus(event.userId);
        await Promise.all([
            this.redis.setLastSequence(event.source, event.userId, event.seq),
            this.redis.setLastEventAt(event.source, event.userId, event.at),
            this.redis.setEffectiveState(event.userId, nextStatus),
        ]);
        if (prevStatus === nextStatus)
            return;
        const updatedEvent = {
            userId: event.userId,
            internalStatus: nextStatus,
            publicStatus: this.toPublicStatus(nextStatus),
            at: new Date().toISOString(),
            version: 1,
        };
        await this.redis
            .getPublisher()
            .publish(presence_types_1.PRESENCE_UPDATED_CHANNEL, JSON.stringify(updatedEvent));
    }
    async applyEventToStorage(event) {
        const flags = await this.redis.getFlags(event.userId);
        switch (event.type) {
            case 'connected': {
                const socketId = this.extractSocketId(event);
                if (!socketId)
                    return;
                await this.redis.addSocket(event.userId, socketId);
                await this.redis.touchSocketAlive(event.userId, socketId, this.heartbeatTtlSec);
                return;
            }
            case 'disconnected': {
                const socketId = this.extractSocketId(event);
                if (!socketId)
                    return;
                await this.redis.removeSocket(event.userId, socketId);
                await this.redis.clearSocketAlive(event.userId, socketId);
                return;
            }
            case 'matching_started':
                flags.matching = true;
                await this.redis.setFlags(event.userId, flags);
                return;
            case 'matching_ended':
                flags.matching = false;
                await this.redis.setFlags(event.userId, flags);
                return;
            case 'game_started':
                flags.inGame = true;
                flags.matching = false;
                await this.redis.setFlags(event.userId, flags);
                return;
            case 'game_ended':
                flags.inGame = false;
                await this.redis.setFlags(event.userId, flags);
                return;
            default:
                return;
        }
    }
    async recomputeEffectiveStatus(userId) {
        const connCount = await this.redis.getSocketCount(userId);
        const flags = await this.redis.getFlags(userId);
        if (flags.inGame)
            return 'IN_GAME';
        if (flags.matching)
            return 'MATCHING';
        if (connCount > 0)
            return 'ONLINE';
        return 'OFFLINE';
    }
    toPublicStatus(state) {
        if (state === 'IN_GAME')
            return 'IN_GAME';
        if (state === 'OFFLINE')
            return 'OFFLINE';
        return 'ONLINE';
    }
    parseEvent(payload) {
        try {
            const parsed = JSON.parse(payload);
            if (!parsed?.userId ||
                !parsed?.eventId ||
                !parsed?.type ||
                !parsed?.source ||
                !parsed?.at ||
                typeof parsed.seq !== 'number') {
                return null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    }
    async isEventFresh(event) {
        const [lastSeq, lastAtMs] = await Promise.all([
            this.redis.getLastSequence(event.source, event.userId),
            this.redis.getLastEventAt(event.source, event.userId),
        ]);
        if (event.seq < lastSeq)
            return false;
        if (event.seq > lastSeq)
            return true;
        const eventAtMs = Date.parse(event.at);
        if (Number.isNaN(eventAtMs))
            return false;
        return eventAtMs >= lastAtMs;
    }
    async reconcileHeartbeatTimeouts() {
        const users = await this.redis.getUsersWithSockets();
        for (const userId of users) {
            const prevStatus = await this.redis.getEffectiveState(userId);
            const socketIds = await this.redis.getSocketIds(userId);
            for (const socketId of socketIds) {
                const alive = await this.redis.isSocketAlive(userId, socketId);
                if (alive)
                    continue;
                await this.redis.removeSocket(userId, socketId);
                await this.redis.clearSocketAlive(userId, socketId);
            }
            const nextStatus = await this.recomputeEffectiveStatus(userId);
            await this.redis.setEffectiveState(userId, nextStatus);
            if (prevStatus === nextStatus)
                continue;
            const updatedEvent = {
                userId,
                internalStatus: nextStatus,
                publicStatus: this.toPublicStatus(nextStatus),
                at: new Date().toISOString(),
                version: 1,
            };
            await this.redis
                .getPublisher()
                .publish(presence_types_1.PRESENCE_UPDATED_CHANNEL, JSON.stringify(updatedEvent));
        }
    }
    extractSocketId(event) {
        const socketId = event.meta?.socketId;
        return typeof socketId === 'string' && socketId.length > 0 ? socketId : null;
    }
    onModuleDestroy() {
        if (this.heartbeatSweepTimer) {
            clearInterval(this.heartbeatSweepTimer);
            this.heartbeatSweepTimer = null;
        }
    }
};
exports.PresenceService = PresenceService;
exports.PresenceService = PresenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [presence_redis_1.PresenceRedis])
], PresenceService);
//# sourceMappingURL=presence.service.js.map