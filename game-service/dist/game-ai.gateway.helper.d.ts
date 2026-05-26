import type { Socket } from 'socket.io';
import type { MatchResult } from './matchmaking/matchmaking.service';
import { GameRedis } from './redis/game.redis';
export declare class GameAiGatewayHelper {
    private readonly gameRedis;
    private readonly pendingAiMatches;
    constructor(gameRedis: GameRedis);
    startAiGame(client: Socket, gameType: string): Promise<void>;
    consumePendingForReady(socketId: string): MatchResult | null;
    cleanupPendingAiMatch(socketId: string): Promise<void>;
    private createAiMatchForSocket;
}
