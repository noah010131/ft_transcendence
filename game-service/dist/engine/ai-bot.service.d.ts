import type { AiDecisionContext } from './ai-match.types';
export declare class AiBotService {
    decideDirection(context: AiDecisionContext): 'up' | 'down' | 'none';
    private predictImpactY;
}
