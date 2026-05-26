import type { Request } from 'express';
import { FriendsService } from './friends.service';
interface SendRequestDto {
    nickname?: unknown;
}
export declare class FriendsController {
    private readonly friendsService;
    constructor(friendsService: FriendsService);
    private getCurrentUserId;
    getFriends(req: Request): Promise<{
        success: boolean;
        friends: import("./friends.service").FriendListItem[];
    }>;
    getFriendIdsForPresence(userId: string): Promise<{
        success: boolean;
        friendIds: string[];
    }>;
    getRequests(req: Request): Promise<{
        success: boolean;
        requests: import("./friends.service").FriendListItem[];
    }>;
    sendRequest(req: Request, body: SendRequestDto): Promise<{
        success: boolean;
        request: import("../entities/friend.entity").Friend;
    }>;
    acceptRequest(req: Request, id: number): Promise<{
        success: boolean;
        request: import("../entities/friend.entity").Friend;
    }>;
    rejectRequest(req: Request, id: number): Promise<{
        success: boolean;
    }>;
    removeFriend(req: Request, id: number): Promise<{
        success: boolean;
    }>;
}
export {};
