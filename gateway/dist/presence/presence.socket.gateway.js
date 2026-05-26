"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const presence_service_1 = require("./presence.service");
const presence_types_1 = require("./presence.types");
const presence_redis_1 = require("./presence.redis");
const jwt = __importStar(require("jsonwebtoken"));
const GAME_INVITE_WAKEUP_CHANNEL = 'game.invite.wakeup';
let PresenceSocketGateway = class PresenceSocketGateway {
    presenceService;
    presenceRedis;
    server;
    socketUserMap = new Map();
    friendIdsFetchTimeoutMs = 1500;
    friendIdsFetchRetryCount = 1;
    constructor(presenceService, presenceRedis) {
        this.presenceService = presenceService;
        this.presenceRedis = presenceRedis;
        void this.subscribePresenceUpdates();
        void this.subscribeGameInviteWakeup();
    }
    async handleConnection(client) {
        const token = this.extractAccessToken(client);
        if (!token) {
            console.warn('[PresenceWS] 연결 거부: accessToken 없음', { socketId: client.id });
            client.disconnect(true);
            return;
        }
        try {
            const payload = jwt.verify(token, process.env.MY_SECRET_KEY ?? '');
            const userId = String(payload?.sub ?? '');
            if (!userId) {
                console.warn('[PresenceWS] 연결 거부: 토큰 sub 없음', { socketId: client.id });
                client.disconnect(true);
                return;
            }
            this.socketUserMap.set(client.id, userId);
            client.join(`user:${userId}`);
            client.on('presence.heartbeat', async () => {
                await this.presenceService.markHeartbeat(userId, client.id);
            });
            console.log('[PresenceWS] connected', {
                userId,
                socketId: client.id,
            });
            await this.presenceService.publishGatewayConnectionEvent(userId, 'connected', client.id);
        }
        catch {
            console.warn('[PresenceWS] 연결 거부: 토큰 검증 실패', { socketId: client.id });
            client.disconnect(true);
        }
    }
    async handleDisconnect(client) {
        const userId = this.socketUserMap.get(client.id);
        if (!userId)
            return;
        this.socketUserMap.delete(client.id);
        console.log('[PresenceWS] disconnected', {
            userId,
            socketId: client.id,
        });
        await this.presenceService.publishGatewayConnectionEvent(userId, 'disconnected', client.id);
    }
    extractAccessToken(client) {
        const header = client.handshake.headers.cookie;
        if (!header)
            return null;
        const token = header
            .split(';')
            .map((v) => v.trim())
            .find((v) => v.startsWith('accessToken='))
            ?.slice('accessToken='.length);
        return token ?? null;
    }
    async subscribePresenceUpdates() {
        const sub = this.presenceRedis.createSubscriber();
        await sub.subscribe(presence_types_1.PRESENCE_UPDATED_CHANNEL);
        sub.on('message', async (channel, payload) => {
            if (channel !== presence_types_1.PRESENCE_UPDATED_CHANNEL)
                return;
            try {
                const event = JSON.parse(payload);
                if (!this.server)
                    return;
                const targets = new Set([`user:${event.userId}`]);
                const friendIds = await this.fetchFriendIds(event.userId);
                if (friendIds.length === 0) {
                    console.warn('[PresenceWS] fan-out 대상이 본인만 남음', {
                        userId: event.userId,
                    });
                }
                for (const friendId of friendIds) {
                    targets.add(`user:${friendId}`);
                }
                for (const room of targets) {
                    this.server.to(room).emit('presence.updated', event);
                }
            }
            catch {
            }
        });
    }
    async subscribeGameInviteWakeup() {
        const sub = this.presenceRedis.createSubscriber();
        await sub.subscribe(GAME_INVITE_WAKEUP_CHANNEL);
        sub.on('message', (channel, payload) => {
            if (channel !== GAME_INVITE_WAKEUP_CHANNEL)
                return;
            try {
                const event = JSON.parse(payload);
                if (!event?.targetUserId || !this.server)
                    return;
                this.server.to(`user:${event.targetUserId}`).emit('game.invite', event);
            }
            catch {
            }
        });
    }
    async fetchFriendIds(userId) {
        const cached = await this.presenceRedis.getFriendIdsCache(userId);
        if (cached) {
            return cached;
        }
        for (let attempt = 0; attempt <= this.friendIdsFetchRetryCount; attempt += 1) {
            const result = await this.fetchFriendIdsOnce(userId, attempt);
            if (result.ok) {
                await this.presenceRedis.setFriendIdsCache(userId, result.friendIds, 15);
                return result.friendIds;
            }
            if (attempt === this.friendIdsFetchRetryCount) {
                console.warn('[PresenceWS] 친구 목록 조회 실패로 fan-out 축소', {
                    userId,
                    reason: result.reason,
                    statusCode: result.statusCode ?? null,
                });
            }
        }
        return [];
    }
    async fetchFriendIdsOnce(userId, attempt) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.friendIdsFetchTimeoutMs);
        try {
            const response = await fetch(`http://user-service:4001/friends/internal/${userId}/ids`, {
                method: 'GET',
                signal: controller.signal,
            });
            if (!response.ok) {
                return {
                    ok: false,
                    friendIds: [],
                    statusCode: response.status,
                    reason: `http_${response.status}`,
                };
            }
            const body = (await response.json());
            if (!Array.isArray(body.friendIds)) {
                return { ok: false, friendIds: [], reason: 'invalid_payload' };
            }
            const friendIds = body.friendIds.filter((id) => typeof id === 'string' && id.length > 0);
            return { ok: true, friendIds };
        }
        catch {
            const aborted = controller.signal.aborted;
            return {
                ok: false,
                friendIds: [],
                reason: aborted ? `timeout_attempt_${attempt + 1}` : 'network_error',
            };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
};
exports.PresenceSocketGateway = PresenceSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PresenceSocketGateway.prototype, "server", void 0);
exports.PresenceSocketGateway = PresenceSocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/presence',
        transports: ['websocket', 'polling'],
        cors: {
            origin: (() => {
                const raw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
                const list = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
                return list.length === 1 ? list[0] : list;
            })(),
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [presence_service_1.PresenceService,
        presence_redis_1.PresenceRedis])
], PresenceSocketGateway);
//# sourceMappingURL=presence.socket.gateway.js.map