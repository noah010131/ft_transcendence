import { Injectable } from '@nestjs/common';
import { AiBotService } from './ai-bot.service';
import { GameEngineService } from './game-engine.service';
import type { EngineState } from './game-engine.types';

@Injectable()
export class AiRuntimeAdapter {
  // 인간처럼 보이게 하기 위한 판단 간격/스킵 설정.
  private readonly baseDecisionIntervalMs = 180; // 반응주기
  private readonly intervalJitterMs = 50;
  private readonly decisionSkipChance = 0.20; // 스킵확률
  private readonly decisionState = new Map<
    string,
    { nextDecisionAt: number; lastDirection: 'up' | 'down' | 'none' }
  >();

  constructor(
    private readonly aiBot: AiBotService,
    private readonly engine: GameEngineService,
  ) {}

  // 현재 세션이 AI 상대인 경우 p2 패들 입력을 자동으로 1틱 적용한다.
  applyAiInputIfNeeded(
    state: EngineState,
    p2UserId: string,
  ): EngineState {
    if (!this.isAiUser(p2UserId)) {
      return state;
    }

    const now = Date.now();
    const memory = this.decisionState.get(p2UserId) ?? {
      nextDecisionAt: 0,
      lastDirection: 'none' as 'up' | 'down' | 'none',
    };

    if (now >= memory.nextDecisionAt) {
      memory.nextDecisionAt = now + this.nextIntervalMs();
      if (Math.random() < this.decisionSkipChance) {
        memory.lastDirection = 'none';
      } else {
        memory.lastDirection = this.aiBot.decideDirection({
          state,
          paddleY: state.p2Y,
        });
      }
      this.decisionState.set(p2UserId, memory);
    }

    const direction = memory.lastDirection;
    if (direction === 'none') {
      return state;
    }
    return this.engine.movePaddle(state, 'p2', direction);
  }
  // 게이트웨이에서 생성한 AI 유저 식별 규칙(AI_BOT_ prefix)에 맞춰 AI 세션 여부를 판정한다.
  private isAiUser(userId: string): boolean {
    return userId.startsWith('AI_BOT_');
  }

  private nextIntervalMs(): number {
    return this.baseDecisionIntervalMs + Math.floor(Math.random() * (this.intervalJitterMs + 1));
  }
}
