import type { EngineState } from './game-engine.types';

export type AiDecisionContext = {
  state: EngineState;
  paddleY: number;
};
