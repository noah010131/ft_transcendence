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
exports.PresenceController = void 0;
const common_1 = require("@nestjs/common");
const presence_service_1 = require("./presence.service");
let PresenceController = class PresenceController {
    presenceService;
    constructor(presenceService) {
        this.presenceService = presenceService;
    }
    async getPresence(userId) {
        return this.presenceService.getPresence(userId);
    }
    async publishEvent(event) {
        await this.presenceService.publishRawEvent(event);
        return { success: true };
    }
    async invalidateFriendCache(body) {
        if (!Array.isArray(body.userIds)) {
            throw new common_1.BadRequestException('USER_IDS_REQUIRED');
        }
        const userIds = body.userIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
        if (userIds.length === 0) {
            throw new common_1.BadRequestException('USER_IDS_REQUIRED');
        }
        await this.presenceService.invalidateFriendCaches(userIds);
        return { success: true };
    }
};
exports.PresenceController = PresenceController;
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PresenceController.prototype, "getPresence", null);
__decorate([
    (0, common_1.Post)('events'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresenceController.prototype, "publishEvent", null);
__decorate([
    (0, common_1.Post)('friends-cache/invalidate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresenceController.prototype, "invalidateFriendCache", null);
exports.PresenceController = PresenceController = __decorate([
    (0, common_1.Controller)('internal/presence'),
    __metadata("design:paramtypes", [presence_service_1.PresenceService])
], PresenceController);
//# sourceMappingURL=presence.controller.js.map