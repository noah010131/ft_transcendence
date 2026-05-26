import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { OnModuleInit } from '@nestjs/common';
import { SendDmDto } from './dto/message.dto';
import { Redis } from 'ioredis';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private readonly chatService;
    private readonly redisSub;
    server: Server;
    private activeUsersCount;
    private isSubscribed;
    constructor(chatService: ChatService, redisSub: Redis);
    onModuleInit(): void;
    private extractUserId;
    private setupPresenceSubscription;
    handleConnection(client: Socket): Promise<void>;
    handleDM(client: Socket, payload: SendDmDto): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
}
