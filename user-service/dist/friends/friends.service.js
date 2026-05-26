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
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const friend_entity_1 = require("../entities/friend.entity");
const user_entity_1 = require("../entities/user.entity");
let FriendsService = class FriendsService {
    friendRepo;
    userRepo;
    constructor(friendRepo, userRepo) {
        this.friendRepo = friendRepo;
        this.userRepo = userRepo;
    }
    async sendRequest(requesterId, nickname) {
        await this.assertFriendActionAllowed(requesterId);
        const addressee = await this.userRepo.findOne({ where: { nickname } });
        if (!addressee) {
            throw new common_1.NotFoundException('USER_NOT_FOUND');
        }
        if (addressee.userId === requesterId) {
            throw new common_1.BadRequestException('CANNOT_ADD_SELF');
        }
        const existing = await this.friendRepo
            .createQueryBuilder('f')
            .where('(f.requesterId = :a AND f.addresseeId = :b) OR (f.requesterId = :b AND f.addresseeId = :a)', { a: requesterId, b: addressee.userId })
            .getOne();
        if (existing) {
            throw new common_1.ConflictException('ALREADY_FRIENDS_OR_REQUESTED');
        }
        const friend = this.friendRepo.create({
            requesterId,
            addresseeId: addressee.userId,
            status: 'pending',
        });
        return this.friendRepo.save(friend);
    }
    async getFriends(userId) {
        const rows = await this.friendRepo
            .createQueryBuilder('f')
            .leftJoinAndSelect('f.requester', 'requester')
            .leftJoinAndSelect('f.addressee', 'addressee')
            .where('f.status = :status', { status: 'accepted' })
            .andWhere('(f.requesterId = :uid OR f.addresseeId = :uid)', { uid: userId })
            .getMany();
        const friends = rows.map((row) => {
            const other = row.requesterId === userId ? row.addressee : row.requester;
            return {
                friendId: row.id,
                userId: other.userId,
                nickname: other.nickname,
                userPhoto: other.userPhoto,
                status: 'OFFLINE',
            };
        });
        const statuses = await Promise.all(friends.map((friend) => this.getPublicPresenceStatus(friend.userId)));
        return friends.map((friend, index) => ({
            ...friend,
            status: statuses[index],
        }));
    }
    async getReceivedRequests(userId) {
        const rows = await this.friendRepo
            .createQueryBuilder('f')
            .leftJoinAndSelect('f.requester', 'requester')
            .where('f.status = :status', { status: 'pending' })
            .andWhere('f.addresseeId = :uid', { uid: userId })
            .getMany();
        const requests = rows.map((row) => ({
            friendId: row.id,
            userId: row.requester.userId,
            nickname: row.requester.nickname,
            userPhoto: row.requester.userPhoto,
            status: 'OFFLINE',
        }));
        const statuses = await Promise.all(requests.map((request) => this.getPublicPresenceStatus(request.userId)));
        return requests.map((request, index) => ({
            ...request,
            status: statuses[index],
        }));
    }
    async acceptRequest(userId, friendId) {
        await this.assertFriendActionAllowed(userId);
        const row = await this.friendRepo.findOne({ where: { id: friendId } });
        if (!row)
            throw new common_1.NotFoundException('REQUEST_NOT_FOUND');
        if (row.addresseeId !== userId) {
            throw new common_1.ForbiddenException('FORBIDDEN');
        }
        if (row.status !== 'pending') {
            throw new common_1.BadRequestException('REQUEST_NOT_PENDING');
        }
        row.status = 'accepted';
        const saved = await this.friendRepo.save(row);
        await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
        return saved;
    }
    async rejectRequest(userId, friendId) {
        const row = await this.friendRepo.findOne({ where: { id: friendId } });
        if (!row)
            throw new common_1.NotFoundException('REQUEST_NOT_FOUND');
        if (row.addresseeId !== userId) {
            throw new common_1.ForbiddenException('FORBIDDEN');
        }
        if (row.status !== 'pending') {
            throw new common_1.BadRequestException('REQUEST_NOT_PENDING');
        }
        await this.friendRepo.delete(row.id);
        await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
    }
    async removeFriend(userId, friendId) {
        await this.assertFriendActionAllowed(userId);
        const row = await this.friendRepo.findOne({ where: { id: friendId } });
        if (!row)
            throw new common_1.NotFoundException('FRIEND_NOT_FOUND');
        if (row.requesterId !== userId && row.addresseeId !== userId) {
            throw new common_1.ForbiddenException('FORBIDDEN');
        }
        if (row.status !== 'accepted') {
            throw new common_1.BadRequestException('NOT_ACCEPTED_FRIENDSHIP');
        }
        await this.friendRepo.delete(row.id);
        await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
    }
    async getAcceptedFriendUserIds(userId) {
        const rows = await this.friendRepo
            .createQueryBuilder('f')
            .select(['f.requesterId', 'f.addresseeId'])
            .where('f.status = :status', { status: 'accepted' })
            .andWhere('(f.requesterId = :uid OR f.addresseeId = :uid)', { uid: userId })
            .getMany();
        return rows.map((row) => row.requesterId === userId ? row.addresseeId : row.requesterId);
    }
    async assertFriendActionAllowed(userId) {
        const baseUrl = process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
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
    async getPublicPresenceStatus(userId) {
        const baseUrl = process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
        const timeoutMs = 700;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(`${baseUrl}/${userId}`, { signal: controller.signal });
            if (!response.ok)
                return 'OFFLINE';
            const presence = (await response.json());
            if (presence.publicStatus === 'IN_GAME')
                return 'IN_GAME';
            if (presence.publicStatus === 'ONLINE')
                return 'ONLINE';
            return 'OFFLINE';
        }
        catch {
            return 'OFFLINE';
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async invalidatePresenceFriendCache(userIds) {
        const baseUrl = process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
        const endpoint = `${baseUrl}/friends-cache/invalidate`;
        const normalized = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0)));
        if (normalized.length === 0)
            return;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 700);
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ userIds: normalized }),
                signal: controller.signal,
            });
        }
        catch {
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(friend_entity_1.Friend)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FriendsService);
//# sourceMappingURL=friends.service.js.map