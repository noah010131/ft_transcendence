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
exports.FriendsController = void 0;
const common_1 = require("@nestjs/common");
const friends_service_1 = require("./friends.service");
let FriendsController = class FriendsController {
    friendsService;
    constructor(friendsService) {
        this.friendsService = friendsService;
    }
    getCurrentUserId(req) {
        const raw = req.headers['x-user-id'];
        if (!raw || Array.isArray(raw) || raw.trim() === '') {
            throw new common_1.UnauthorizedException('x-user-id header required (temp)');
        }
        return raw;
    }
    async getFriends(req) {
        const userId = this.getCurrentUserId(req);
        const friends = await this.friendsService.getFriends(userId);
        return { success: true, friends };
    }
    async getFriendIdsForPresence(userId) {
        const friendIds = await this.friendsService.getAcceptedFriendUserIds(userId);
        return { success: true, friendIds };
    }
    async getRequests(req) {
        const userId = this.getCurrentUserId(req);
        const requests = await this.friendsService.getReceivedRequests(userId);
        return { success: true, requests };
    }
    async sendRequest(req, body) {
        const userId = this.getCurrentUserId(req);
        if (typeof body?.nickname !== 'string' || body.nickname.trim() === '') {
            throw new common_1.BadRequestException('NICKNAME_REQUIRED');
        }
        const request = await this.friendsService.sendRequest(userId, body.nickname.trim());
        return { success: true, request };
    }
    async acceptRequest(req, id) {
        const userId = this.getCurrentUserId(req);
        const request = await this.friendsService.acceptRequest(userId, id);
        return { success: true, request };
    }
    async rejectRequest(req, id) {
        const userId = this.getCurrentUserId(req);
        await this.friendsService.rejectRequest(userId, id);
        return { success: true };
    }
    async removeFriend(req, id) {
        const userId = this.getCurrentUserId(req);
        await this.friendsService.removeFriend(userId, id);
        return { success: true };
    }
};
exports.FriendsController = FriendsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "getFriends", null);
__decorate([
    (0, common_1.Get)('internal/:userId/ids'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "getFriendIdsForPresence", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "getRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "sendRequest", null);
__decorate([
    (0, common_1.Patch)('requests/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "acceptRequest", null);
__decorate([
    (0, common_1.Delete)('requests/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "rejectRequest", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "removeFriend", null);
exports.FriendsController = FriendsController = __decorate([
    (0, common_1.Controller)('friends'),
    __metadata("design:paramtypes", [friends_service_1.FriendsService])
], FriendsController);
//# sourceMappingURL=friends.controller.js.map