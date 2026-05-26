import { Namespace } from 'socket.io';
import { GameRedis } from '../redis/game.redis';
import type { MatchResult } from './matchmaking.service';
export declare class FriendInviteService {
    private readonly gameRedis;
    private readonly logger;
    private readonly pendingInvites;
    private readonly INVITE_TTL_MS;
    constructor(gameRedis: GameRedis);
    invite(server: Namespace, inviter: {
        userId: string;
        socketId: string;
        isGuest: boolean;
        nickname: string;
    }, targetUserId: string): Promise<string | null>;
    tryFulfillOnConnect(server: Namespace, target: {
        userId: string;
        socketId: string;
        isGuest: boolean;
    }): Promise<MatchResult | null>;
    cancelInvolvingUser(userId: string, server: Namespace): {
        canceled: boolean;
    };
    private expireInvite;
    private clearInviteAndTimeout;
}
