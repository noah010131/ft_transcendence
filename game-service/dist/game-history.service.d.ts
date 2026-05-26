import { Repository } from 'typeorm';
import { GameRecordEntity } from './game-record.entity';
type GameRecordResponse = {
    id: number;
    winnerNickname: string;
    loserNickname: string;
    winnerScore: number;
    loserScore: number;
    playedAt: string;
};
export declare class GameHistoryService {
    private readonly gameRecordRepository;
    constructor(gameRecordRepository: Repository<GameRecordEntity>);
    getHistoryByUserId(userId: string): Promise<GameRecordResponse[]>;
}
export {};
