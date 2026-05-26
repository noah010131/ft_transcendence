import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat.entity';
export declare class ChatRepository {
    private readonly repo;
    constructor(repo: Repository<ChatMessage>);
    saveMessage(data: Partial<ChatMessage>): Promise<ChatMessage>;
    findUnreadMessages(userId: string): Promise<ChatMessage[]>;
    findDmHistory(userA: string, userB: string): Promise<ChatMessage[]>;
}
