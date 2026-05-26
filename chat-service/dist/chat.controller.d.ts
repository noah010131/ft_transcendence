import { ChatService } from './chat.service';
import { Request } from 'express';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    private getCurrentUserId;
    getHistory(req: Request, targetId: string): Promise<import("./entities/chat.entity").ChatMessage[]>;
    getStatus(userId: string): Promise<{
        status: string;
    }>;
    getRedisStatus(userId: string): Promise<{
        userId: string;
        socketId: string;
    }>;
    getHistoryForDebug(user1: string, user2: string): Promise<{
        count: number;
        data: import("./entities/chat.entity").ChatMessage[];
    }>;
}
