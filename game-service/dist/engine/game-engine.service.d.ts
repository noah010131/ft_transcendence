import type { EngineState, GameResult, PaddleDirection, PlayerSlot } from './game-engine.types';
export declare class GameEngineService {
    createInitialState(): EngineState;
    movePaddle(state: EngineState, player: PlayerSlot, direction: PaddleDirection): EngineState;
    updateTick(state: EngineState): EngineState;
    getGameResultIfOver(state: EngineState, p1UserId: string, p2UserId: string): GameResult | null;
    private clampPaddleY;
    private resetBall;
}
