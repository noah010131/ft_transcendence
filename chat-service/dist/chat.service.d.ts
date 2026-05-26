import { Redis } from 'ioredis';
import { ChatRepository } from './repository/chat.repository';
export declare class ChatService {
    private readonly redis;
    private readonly chatRepo;
    private readonly presenceApiUrl;
    constructor(redis: Redis, chatRepo: ChatRepository);
    processMessage(from: string, to: string, message: string): Promise<import("./entities/chat.entity").ChatMessage>;
    saveSocketId(userId: string, socketId: string): Promise<void>;
    removeSocketId(userId: string): Promise<void>;
    getUserSocketId(userId: string): Promise<string | null>;
    getDmHistory(myId: string, targetId: string): Promise<import("./entities/chat.entity").ChatMessage[]>;
    getUserStatus(userId: string): Promise<string>;
}
