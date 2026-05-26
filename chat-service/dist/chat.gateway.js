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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const chat_service_1 = require("./chat.service");
const common_2 = require("@nestjs/common");
const presence_types_1 = require("./types/presence.types");
const message_dto_1 = require("./dto/message.dto");
const ioredis_1 = require("ioredis");
const chatCorsOrigin = (() => {
    const raw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
    const list = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
    return list.length === 1 ? list[0] : list;
})();
let ChatGateway = class ChatGateway {
    constructor(chatService, redisSub) {
        this.chatService = chatService;
        this.redisSub = redisSub;
        this.activeUsersCount = 0;
        this.isSubscribed = false;
    }
    onModuleInit() {
        this.setupPresenceSubscription();
    }
    extractUserId(client) {
        const userId = client.handshake.headers['x-user-id'];
        if (!userId) {
            const queryId = client.handshake.query.userId;
            return typeof queryId === 'string' ? queryId : null;
        }
        if (Array.isArray(userId) || userId.trim() === '') {
            return null;
        }
        return userId;
    }
    setupPresenceSubscription() {
        this.redisSub.on('message', (channel, message) => {
            if (channel === presence_types_1.PRESENCE_UPDATED_CHANNEL) {
                try {
                    const event = JSON.parse(message);
                    if (!event || !event.userId)
                        return;
                    this.server.emit('user_presence_changed', {
                        userId: event.userId,
                        status: event.publicStatus,
                    });
                    console.log(`Subscription [Presence Update] User ${event.userId} is now ${event.publicStatus}`);
                }
                catch (error) {
                    console.error(`[Redis Sub Error] 메시지 파싱 실패: ${error.message}`);
                }
            }
        });
    }
    async handleConnection(client) {
        console.log('소캣 chat-gateway 도착');
        try {
            const userId = this.extractUserId(client);
            if (!userId) {
                console.error(`[Chat] 인증 헤더 누락: 접속 거부 (ID: ${client.id})`);
                client.disconnect();
                return;
            }
            client.data.userId = userId;
            await this.chatService.saveSocketId(userId, client.id);
            this.activeUsersCount++;
            console.log(`[Chat] 유저 온라인: ${userId} (현재 접속자: ${this.activeUsersCount})`);
            if (this.activeUsersCount === 1 && !this.isSubscribed) {
                await this.redisSub.subscribe(presence_types_1.PRESENCE_UPDATED_CHANNEL);
                this.isSubscribed = true;
                console.log('[Redis] 첫 채팅 유저 접속 - 구독 활성화');
            }
        }
        catch (error) {
            console.error(`[Chat] 연결 처리 중 예외 발생: ${error.message}`);
            client.disconnect();
        }
    }
    async handleDM(client, payload) {
        const from = client.data.userId;
        const { to, message } = payload;
        if (!from) {
            console.error(`[DM Error] 인증되지 않은 송신자 접근`);
            client.emit('error', { message: '인증 정보가 없습니다.' });
            return;
        }
        try {
            console.log(`[DM Request] From: ${from} -> To: ${to}`);
            const chatLog = await this.chatService.processMessage(from, to, message);
            const targetSocketId = await this.chatService.getUserSocketId(to);
            if (targetSocketId) {
                this.server.to(targetSocketId).emit('new_dm', chatLog);
                console.log(`[Real-time Push] Sent to ${to}`);
            }
            client.emit('send_success', { messageId: chatLog.id });
        }
        catch (err) {
            console.error(`[DM Process Error] ${err.message}`);
            client.emit('error', { message: '메시지 전송 실패' });
        }
    }
    async handleDisconnect(client) {
        const userId = client.data.userId;
        if (userId) {
            try {
                await this.chatService.removeSocketId(userId);
                this.activeUsersCount--;
                console.log(`[Disconnected] User: ${userId} (남은 접속자: ${this.activeUsersCount})`);
                if (this.activeUsersCount <= 0 && this.isSubscribed) {
                    await this.redisSub.unsubscribe(presence_types_1.PRESENCE_UPDATED_CHANNEL);
                    this.isSubscribed = false;
                    this.activeUsersCount = 0;
                    console.log('[Redis] 접속 유저 없음 - 구독 해제');
                }
            }
            catch (err) {
                console.error(`[Redis Error] 오프라인 상태 변경 실패: ${err.message}`);
            }
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    (0, websockets_1.SubscribeMessage)('send_dm'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, message_dto_1.SendDmDto]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleDM", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: 'chat', cors: { origin: chatCorsOrigin, credentials: true } }),
    __param(1, (0, common_2.Inject)('REDIS_SUB')),
    __metadata("design:paramtypes", [chat_service_1.ChatService, ioredis_1.Redis])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map