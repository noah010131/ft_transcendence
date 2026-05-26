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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    getCurrentUserId(req) {
        const raw = req.headers['x-user-id'];
        if (!raw || Array.isArray(raw) || raw.trim() === '') {
            throw new common_1.UnauthorizedException('x-user-id header required (temp)');
        }
        return raw;
    }
    async uploadPhoto(req, file) {
        const userId = this.getCurrentUserId(req);
        return await this.userService.handleFileUpload(userId, file);
    }
    async initializeUser(data) {
        const user = await this.userService.createUserProfile(data.id, data.loginId, data.nickname, data.role ?? 'normal');
        return {
            success: true,
            user: {
                userId: user.userId,
                loginId: user.loginId,
                nickname: user.nickname,
                userPhoto: user.userPhoto,
                role: user.role,
            },
        };
    }
    async deleteGuestUser(userId, secret) {
        const expected = process.env.INTERNAL_SECRET;
        if (expected && secret !== expected) {
            throw new common_1.UnauthorizedException('INTERNAL_SECRET_INVALID');
        }
        return this.userService.deleteGuestUser(userId);
    }
    async getMe(req) {
        const currentUserId = this.getCurrentUserId(req);
        if (!currentUserId) {
            throw new common_1.UnauthorizedException('[getMe] 인증 정보가 없습니다.');
        }
        console.log('[getme] 입장');
        const user = await this.userService.getMe(currentUserId);
        if (!user) {
            throw new common_1.NotFoundException('[getMe] 유저를 찾을 수 없습니다.');
        }
        return {
            success: true,
            user: {
                userId: user.userId,
                loginId: user.loginId,
                nickname: user.nickname,
                userPhoto: user.userPhoto,
                role: user.role,
            },
        };
    }
    async updateProfile(req, data) {
        const currentUserId = this.getCurrentUserId(req);
        if (!currentUserId) {
            throw new common_1.UnauthorizedException('[updateProfile] 인증 정보가 없습니다.');
        }
        const updatedUser = await this.userService.updateProfile(currentUserId, data);
        if (!updatedUser) {
            throw new common_1.NotFoundException('[updateProfile] 유저를 찾을 수 없습니다.');
        }
        return {
            success: true,
            user: {
                userId: updatedUser.userId,
                loginId: updatedUser.loginId,
                nickname: updatedUser.nickname,
                userPhoto: updatedUser.userPhoto,
                role: updatedUser.role,
            },
        };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('uploadPhoto'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                callback(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                return callback(new common_1.BadRequestException('IMAGE_FORMAT_NOT_ALLOWED'), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Post)('init'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "initializeUser", null);
__decorate([
    (0, common_1.Delete)('internal/users/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Headers)('x-internal-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteGuestUser", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map