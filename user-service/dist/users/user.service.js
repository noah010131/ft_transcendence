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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const nickname_filter_1 = require("../utils/nickname-filter");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const DEFAULT_PHOTO_PATH = '/api/users/uploads/default.jpg';
const UPLOADS_PREFIX_PATH = '/api/users/uploads';
let UserService = class UserService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async createUserProfile(id, loginId, nickname, role = 'normal') {
        try {
            if (typeof nickname !== 'string' || nickname.trim() === '' || !(0, nickname_filter_1.isNicknameAllowed)(nickname)) {
                throw new common_1.BadRequestException('NICKNAME_NOT_ALLOWED');
            }
            const normalizedNickname = nickname.trim();
            const existingNickname = await this.userRepository.findOne({
                where: { nickname: normalizedNickname },
            });
            if (existingNickname) {
                throw new common_1.BadRequestException('NICKNAME_ALREADY_EXISTS');
            }
            const newUser = this.userRepository.create({
                userId: id,
                loginId,
                nickname: normalizedNickname,
                userPhoto: DEFAULT_PHOTO_PATH,
                role,
            });
            console.log('유저 db생성', { id, role });
            return await this.userRepository.save(newUser);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            const pgCode = error.code ?? error.driverError?.code;
            if (pgCode === '23505') {
                const detail = error.driverError?.detail ?? error.detail ?? '';
                if (detail.includes('loginId')) {
                    throw new common_1.BadRequestException('LOGIN_ID_ALREADY_EXISTS');
                }
                throw new common_1.BadRequestException('NICKNAME_ALREADY_EXISTS');
            }
            console.error('프로필 생성 중 DB 에러:', error.message);
            throw new common_1.InternalServerErrorException('유저 프로필 생성 중 서버 에러가 발생했습니다.');
        }
    }
    async getMe(userId) {
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user)
            return null;
        if (user.userPhoto && user.userPhoto !== DEFAULT_PHOTO_PATH) {
            const fileName = user.userPhoto.split('/').pop();
            if (fileName) {
                const filePath = (0, path_1.join)(process.cwd(), 'uploads', fileName);
                if (!fs.existsSync(filePath)) {
                    console.log(`📂 파일 없음: ${fileName}. 기본값으로 복구.`);
                    user.userPhoto = DEFAULT_PHOTO_PATH;
                    await this.userRepository.save(user);
                }
            }
        }
        console.log('[getme] 성공', user.nickname);
        return user;
    }
    async updateProfile(userId, data) {
        await this.assertProfileEditable(userId);
        const user = await this.getMe(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('유저를 찾을 수 없습니다.');
        }
        if (data.nickname !== undefined) {
            if (typeof data.nickname !== 'string' || data.nickname.trim() === '' || !(0, nickname_filter_1.isNicknameAllowed)(data.nickname)) {
                throw new common_1.BadRequestException('NICKNAME_NOT_ALLOWED');
            }
            const normalizedNickname = data.nickname.trim();
            const existingNickname = await this.userRepository.findOne({
                where: { nickname: normalizedNickname },
            });
            if (existingNickname && existingNickname.userId !== user.userId) {
                throw new common_1.BadRequestException('NICKNAME_ALREADY_EXISTS');
            }
            data.nickname = normalizedNickname;
        }
        await this.userRepository.update({ userId: user.userId }, {
            ...(data.userPhoto !== undefined && { userPhoto: data.userPhoto }),
            ...(data.nickname !== undefined && { nickname: data.nickname }),
        });
        console.log('[updateProfile] update 성공', user.userPhoto);
        return await this.userRepository.findOne({ where: { userId: user.userId } });
    }
    async deleteGuestUser(userId) {
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            return { success: true, message: 'USER_ALREADY_GONE' };
        }
        if (user.role !== 'guest') {
            throw new common_1.BadRequestException('NOT_A_GUEST');
        }
        await this.userRepository.delete({ userId });
        return { success: true, message: 'GUEST_DELETED' };
    }
    async handleFileUpload(userId, file) {
        if (!file) {
            throw new common_1.BadRequestException('파일이 존재하지 않습니다.');
        }
        const fileUrl = `${UPLOADS_PREFIX_PATH}/${file.filename}`;
        const updatedUser = await this.updateProfile(userId, { userPhoto: fileUrl });
        return {
            success: true,
            url: fileUrl,
            user: updatedUser
        };
    }
    async assertProfileEditable(userId) {
        const baseUrl = process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://gateway:8000/internal/presence';
        const timeoutMs = 700;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(`${baseUrl}/${userId}`, { signal: controller.signal });
            if (!response.ok) {
                throw new common_1.InternalServerErrorException('PRESENCE_CHECK_FAILED');
            }
            const presence = (await response.json());
            if (presence.internalStatus === 'MATCHING' || presence.internalStatus === 'IN_GAME') {
                throw new common_1.BadRequestException('PRESENCE_ACTION_BLOCKED');
            }
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('PRESENCE_CHECK_FAILED');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map