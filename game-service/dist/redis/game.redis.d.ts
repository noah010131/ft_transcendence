import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PresenceEventType } from '../types/presence.types';
export interface GameSession {
    gameId: string;
    p1: string;
    p2: string;
    state: 'waiting' | 'playing' | 'ended';
    createdAt: string;
}
export declare class GameRedis implements OnModuleDestroy {
    private readonly configService;
    private readonly client;
    private readonly pub;
    private readonly LOCK_KEY;
    private readonly LOCK_TTL_SEC;
    private queueKey;
    constructor(configService: ConfigService);
    enqueue(userId: string, socketId: string, isGuest: boolean): Promise<void>;
    removeFromQueue(userId: string, isGuest: boolean): Promise<number>;
    queueLength(isGuest: boolean): Promise<number>;
    popTwo(isGuest: boolean): Promise<string[]>;
    pushBackToFront(userId: string, socketId: string | null, isGuest: boolean): Promise<void>;
    getQueueSocketId(userId: string): Promise<string | null>;
    clearQueueSocket(userId: string): Promise<void>;
    acquireMatchLock(): Promise<string | null>;
    releaseMatchLock(token: string): Promise<void>;
    createSession(p1: string, p2: string): Promise<GameSession>;
    getSession(gameId: string): Promise<GameSession | null>;
    getUserGameId(userId: string): Promise<string | null>;
    deleteSession(gameId: string): Promise<void>;
    publishInviteWakeup(targetUserId: string, inviterUserId: string, inviterNickname: string): Promise<void>;
    publishPresence(userId: string, type: PresenceEventType): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private socketKey;
    private sessionKey;
    private userGameKey;
}
