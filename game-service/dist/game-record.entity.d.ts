export declare class GameRecordEntity {
    id: number;
    gameId: string | null;
    player1Id: string;
    player2Id: string;
    winnerId: string;
    loserId: string;
    winnerNickname: string;
    loserNickname: string;
    player1Score: number;
    player2Score: number;
    endedReason: 'normal' | 'forfeit';
    playedAt: Date;
}
