import { Namespace } from 'socket.io';
import { GameRedis, GameSession } from '../redis/game.redis';
export interface MatchResult {
    session: GameSession;
    p1SocketId: string;
    p2SocketId: string;
}
export declare class MatchmakingService {
    private readonly gameRedis;
    private readonly logger;
    constructor(gameRedis: GameRedis);
    enqueue(userId: string, socketId: string, isGuest: boolean, server: Namespace): Promise<MatchResult | null>;
    dequeue(userId: string, isGuest: boolean): Promise<boolean>;
    tryMatch(isGuest: boolean, server: Namespace): Promise<MatchResult | null>;
    private verifyAlive;
}
