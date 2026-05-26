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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const chat_repository_1 = require("./repository/chat.repository");
const axios_1 = require("axios");
let ChatService = class ChatService {
    constructor(redis, chatRepo) {
        this.redis = redis;
        this.chatRepo = chatRepo;
        this.presenceApiUrl = 'http://gateway:8000/internal/presence';
    }
    async processMessage(from, to, message) {
        try {
            const chatLog = await this.chatRepo.saveMessage({
                senderId: from,
                receiverId: to,
                content: message,
            });
            //console.log(`[Service] 메시지 DB 저장 성공 (ID: ${chatLog.id})`);
            return chatLog;
        }
        catch (error) {
            console.error(`[Service Error] DB 저장 실패: ${error.message}`);
            throw error;
        }
    }
    async saveSocketId(userId, socketId) {
        try {
            await this.redis.set(`user:socket:${userId}`, socketId, 'EX', 86400);
            //console.log(`[Redis] 유저 ${userId} 상태 저장 (Socket: ${socketId})`);
        }
        catch (error) {
            console.error(`[Redis Error] saveSocketId 실패: ${error.message}`);
        }
    }
    async removeSocketId(userId) {
        try {
            await this.redis.del(`user:socket:${userId}`);
            //console.log(`[Redis] 유저 ${userId} 상태 삭제 완료`);
        }
        catch (error) {
            console.error(`[Redis Error] removeSocketId 실패: ${error.message}`);
        }
    }
    async getUserSocketId(userId) {
        try {
            const socketId = await this.redis.get(`user:socket:${userId}`);
            return socketId;
        }
        catch (error) {
            console.error(`[Redis Error] 소켓 ID 조회 실패: ${error.message}`);
            return null;
        }
    }
    async getDmHistory(myId, targetId) {
        try {
            //console.log(`[Service] History 조회 요청: ${myId} <-> ${targetId}`);
            return await this.chatRepo.findDmHistory(myId, targetId);
        }
        catch (error) {
            console.error(`[Service Error] History 조회 중 실패: ${error.message}`);
            return [];
        }
    }
    async getUserStatus(userId) {
        try {
            //console.log('USER STATUS Called');
            const response = await axios_1.default.get(`${this.presenceApiUrl}/${userId}`);
            return response.data.publicStatus || 'OFFLINE';
        }
        catch (error) {
            console.error(`[Presence API Error] 유저 상태 조회 실패: ${error.message}`);
            return 'OFFLINE';
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        chat_repository_1.ChatRepository])
], ChatService);
//# sourceMappingURL=chat.service.js.map