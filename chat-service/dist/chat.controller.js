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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const express_1 = require("express");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    getCurrentUserId(req) {
        const userId = req.headers['x-user-id'];
        if (!userId || Array.isArray(userId) || userId.trim() === '') {
            throw new common_1.UnauthorizedException('유효하지 않은 유저 ID 헤더입니다.');
        }
        return userId.trim();
    }
    async getHistory(req, targetId) {
        const myId = this.getCurrentUserId(req);
        return await this.chatService.getDmHistory(myId, targetId);
    }
    async getStatus(userId) {
        const status = await this.chatService.getUserStatus(userId);
        return { status };
    }
    async getRedisStatus(userId) {
        const socketId = await this.chatService.getUserSocketId(userId);
        return {
            userId,
            socketId: socketId || 'OFFLINE',
        };
    }
    async getHistoryForDebug(user1, user2) {
        const history = await this.chatService.getDmHistory(user1, user2);
        return {
            count: history.length,
            data: history,
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('history/:targetId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('targetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _a : Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('status/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('debug/redis/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getRedisStatus", null);
__decorate([
    (0, common_1.Get)('debug/history/:user1/:user2'),
    __param(0, (0, common_1.Param)('user1')),
    __param(1, (0, common_1.Param)('user2')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getHistoryForDebug", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map