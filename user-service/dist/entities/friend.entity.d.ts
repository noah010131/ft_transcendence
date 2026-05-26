import { User } from './user.entity';
export type FriendStatus = 'pending' | 'accepted';
export declare class Friend {
    id: number;
    requesterId: string;
    addresseeId: string;
    status: FriendStatus;
    createdAt: Date;
    updatedAt: Date;
    requester: User;
    addressee: User;
}
