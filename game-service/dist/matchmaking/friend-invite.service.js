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
var FriendInviteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendInviteService = void 0;
const common_1 = require("@nestjs/common");
const game_redis_1 = require("../redis/game.redis");
let FriendInviteService = FriendInviteService_1 = class FriendInviteService {
    constructor(gameRedis) {
        this.gameRedis = gameRedis;
        this.logger = new common_1.Logger(FriendInviteService_1.name);
        this.pendingInvites = new Map();
        this.INVITE_TTL_MS = 30_000;
    }
    async invite(server, inviter, targetUserId) {
        if (inviter.userId === targetUserId) {
            return 'CANNOT_INVITE_SELF';
        }
        if (this.pendingInvites.has(targetUserId)) {
            return 'TARGET_ALREADY_INVITED';
        }
        for (const invite of this.pendingInvites.values()) {
            if (invite.inviterUserId === inviter.userId) {
                return 'ALREADY_INVITING';
            }
        }
        const inviterGame = await this.gameRedis.getUserGameId(inviter.userId);
        if (inviterGame) {
            return 'ALREADY_IN_GAME';
        }
        const targetGame = await this.gameRedis.getUserGameId(targetUserId);
        if (targetGame) {
            return 'TARGET_BUSY';
        }
        const timeoutHandle = setTimeout(() => {
            this.expireInvite(targetUserId, server);
        }, this.INVITE_TTL_MS);
        this.pendingInvites.set(targetUserId, {
            inviterUserId: inviter.userId,
            inviterSocketId: inviter.socketId,
            inviterIsGuest: inviter.isGuest,
            inviterNickname: inviter.nickname,
            timeoutHandle,
        });
        await this.gameRedis.publishInviteWakeup(targetUserId, inviter.userId, inviter.nickname);
        this.logger.log(`invite created: inviter=${inviter.userId} target=${targetUserId}`);
        return null;
    }
    async tryFulfillOnConnect(server, target) {
        const invite = this.pendingInvites.get(target.userId);
        if (!invite)
            return null;
        const inviterSocket = server.sockets.get(invite.inviterSocketId);
        if (!inviterSocket || inviterSocket.data?.userId !== invite.inviterUserId) {
            this.clearInviteAndTimeout(target.userId);
            this.logger.warn(`invite stale: inviter socket gone (inviter=${invite.inviterUserId}, target=${target.userId})`);
            server.to(target.socketId).emit('queue_error', {
                code: 'INVITE_INVITER_GONE',
                message: 'Inviter is no longer connected.',
            });
            return null;
        }
        this.clearInviteAndTimeout(target.userId);
        const session = await this.gameRedis.createSession(invite.inviterUserId, target.userId);
        const room = `game:${session.gameId}`;
        await server.in(invite.inviterSocketId).socketsJoin(room);
        await server.in(target.socketId).socketsJoin(room);
        const targetSocket = server.sockets.get(target.socketId);
        const inviterNickname = String(inviterSocket.data?.nickname ?? invite.inviterUserId);
        const targetNickname = String(targetSocket?.data?.nickname ?? target.userId);
        server.to(invite.inviterSocketId).emit('match_found', {
            gameId: session.gameId,
            side: 'p1',
            opponent: targetNickname,
        });
        server.to(target.socketId).emit('match_found', {
            gameId: session.gameId,
            side: 'p2',
            opponent: inviterNickname,
        });
        this.logger.log(`invite fulfilled: inviter=${invite.inviterUserId} target=${target.userId} gameId=${session.gameId}`);
        return {
            session,
            p1SocketId: invite.inviterSocketId,
            p2SocketId: target.socketId,
        };
    }
    cancelInvolvingUser(userId, server) {
        const asTarget = this.pendingInvites.get(userId);
        if (asTarget) {
            this.clearInviteAndTimeout(userId);
            const inviterSocket = server.sockets.get(asTarget.inviterSocketId);
            if (inviterSocket) {
                inviterSocket.emit('queue_error', {
                    code: 'INVITE_TARGET_LEFT',
                    message: 'Friend declined or disconnected.',
                });
                inviterSocket.emit('match_canceled');
            }
            this.logger.log(`invite canceled (target left): target=${userId}`);
            return { canceled: true };
        }
        for (const [targetId, invite] of this.pendingInvites) {
            if (invite.inviterUserId === userId) {
                this.clearInviteAndTimeout(targetId);
                this.logger.log(`invite canceled (inviter left): inviter=${userId} target=${targetId}`);
                return { canceled: true };
            }
        }
        return { canceled: false };
    }
    expireInvite(targetUserId, server) {
        const invite = this.pendingInvites.get(targetUserId);
        if (!invite)
            return;
        this.pendingInvites.delete(targetUserId);
        const inviterSocket = server.sockets.get(invite.inviterSocketId);
        if (inviterSocket) {
            inviterSocket.emit('queue_error', {
                code: 'INVITE_TIMEOUT',
                message: 'Friend invite timed out.',
            });
            inviterSocket.emit('match_canceled');
        }
        this.logger.log(`invite expired: inviter=${invite.inviterUserId} target=${targetUserId}`);
    }
    clearInviteAndTimeout(targetUserId) {
        const invite = this.pendingInvites.get(targetUserId);
        if (!invite)
            return;
        clearTimeout(invite.timeoutHandle);
        this.pendingInvites.delete(targetUserId);
    }
};
exports.FriendInviteService = FriendInviteService;
exports.FriendInviteService = FriendInviteService = FriendInviteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_redis_1.GameRedis])
], FriendInviteService);
//# sourceMappingURL=friend-invite.service.js.map