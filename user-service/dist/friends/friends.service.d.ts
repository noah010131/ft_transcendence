import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { User } from '../entities/user.entity';
export interface FriendListItem {
    friendId: number;
    userId: string;
    nickname: string;
    userPhoto: string;
    status: 'OFFLINE' | 'ONLINE' | 'IN_GAME';
}
export declare class FriendsService {
    private readonly friendRepo;
    private readonly userRepo;
    constructor(friendRepo: Repository<Friend>, userRepo: Repository<User>);
    sendRequest(requesterId: string, nickname: string): Promise<Friend>;
    getFriends(userId: string): Promise<FriendListItem[]>;
    getReceivedRequests(userId: string): Promise<FriendListItem[]>;
    acceptRequest(userId: string, friendId: number): Promise<Friend>;
    rejectRequest(userId: string, friendId: number): Promise<void>;
    removeFriend(userId: string, friendId: number): Promise<void>;
    getAcceptedFriendUserIds(userId: string): Promise<string[]>;
    private assertFriendActionAllowed;
    private getPublicPresenceStatus;
    private invalidatePresenceFriendCache;
}
