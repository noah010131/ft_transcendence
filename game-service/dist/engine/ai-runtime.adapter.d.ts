import { AiBotService } from './ai-bot.service';
import { GameEngineService } from './game-engine.service';
import type { EngineState } from './game-engine.types';
export declare class AiRuntimeAdapter {
    private readonly aiBot;
    private readonly engine;
    private readonly baseDecisionIntervalMs;
    private readonly intervalJitterMs;
    private readonly decisionSkipChance;
    private readonly decisionState;
    constructor(aiBot: AiBotService, engine: GameEngineService);
    applyAiInputIfNeeded(state: EngineState, p2UserId: string): EngineState;
    private isAiUser;
    private nextIntervalMs;
}
