import { GameHistoryService } from './game-history.service';
export declare class GameHistoryController {
    private readonly gameHistoryService;
    constructor(gameHistoryService: GameHistoryService);
    getHistory(userId: string): Promise<{
        id: number;
        winnerNickname: string;
        loserNickname: string;
        winnerScore: number;
        loserScore: number;
        playedAt: string;
    }[]>;
}
