import { Repository } from 'typeorm';
import { Namespace, Socket } from 'socket.io';
import type { MovePaddlePayload } from './game-engine.types';
import { GameEngineService } from './game-engine.service';
import { AiRuntimeAdapter } from './ai-runtime.adapter';
import { GameRecordEntity } from '../game-record.entity';
import type { MatchResult } from '../matchmaking/matchmaking.service';
import { GameRedis } from '../redis/game.redis';
export interface PendingMatchSurvivor {
    userId: string;
    socketId: string;
    isGuest: boolean;
}
export declare class GameRuntimeService {
    private readonly engine;
    private readonly aiRuntimeAdapter;
    private readonly gameRedis;
    private readonly gameRecordRepository;
    private readonly sessions;
    private readonly socketToGameId;
    private readonly pendingMatches;
    private readonly socketToPendingGameId;
    constructor(engine: GameEngineService, aiRuntimeAdapter: AiRuntimeAdapter, gameRedis: GameRedis, gameRecordRepository: Repository<GameRecordEntity>);
    prepareMatch(match: MatchResult, isGuest: boolean, mode?: 'queue' | 'friend'): void;
    handleReady(client: Socket, server: Namespace): Promise<void>;
    handlePendingDisconnect(client: Socket, server: Namespace): Promise<{
        wasPending: boolean;
        alive: PendingMatchSurvivor | null;
        isGuest: boolean;
        mode: 'queue' | 'friend' | null;
    }>;
    startMatch(match: MatchResult, server: Namespace): Promise<void>;
    movePaddle(client: Socket, payload: MovePaddlePayload): void;
    handleDisconnect(client: Socket, server: Namespace): Promise<void>;
    private tick;
    private emitGameState;
    private emitGameOver;
    private finishGame;
    private endSession;
    private saveGameRecord;
    private getSocketNickname;
    private isAiUserId;
    private getPlayerSlotBySocket;
}
