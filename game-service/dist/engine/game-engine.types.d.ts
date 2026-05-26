export interface GameRecord {
    id: number;
    winnerNickname: string;
    loserNickname: string;
    winnerScore: number;
    loserScore: number;
    playedAt: string;
}
export interface GameState {
    ballX: number;
    ballY: number;
    p1Y: number;
    p2Y: number;
    score1: number;
    score2: number;
}
export interface GameResult {
    winnerId: string;
    score1: number;
    score2: number;
}
export interface MatchFoundPayload {
    gameId: string;
    playerSlot: PlayerSlot;
}
export interface MovePaddlePayload {
    direction: PaddleDirection;
}
export interface GameOverPayload extends GameResult {
    gameId: string;
}
export type PaddleDirection = 'up' | 'down';
export type PlayerSlot = 'p1' | 'p2';
export interface EngineState extends GameState {
    ballVx: number;
    ballVy: number;
}
