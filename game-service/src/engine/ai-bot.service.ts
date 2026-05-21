import { Injectable } from '@nestjs/common';
import type { AiDecisionContext } from './ai-match.types';
import {
  BALL_RADIUS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  PADDLE_SPEED,
  PADDLE_WIDTH,
} from './game-engine.constants';

@Injectable()
export class AiBotService {
  // 공의 y를 추적해 p2 패들 방향을 결정한다.
  decideDirection(context: AiDecisionContext): 'up' | 'down' | 'none' {
    const { state, paddleY } = context;
    const paddleCenterY = paddleY + PADDLE_HEIGHT / 2;
    const targetY = this.predictImpactY(state.ballX, state.ballY, state.ballVx, state.ballVy);

    // 목표와 패들 중심 차이가 너무 작으면 떨림을 줄이기 위해 정지한다.
    const deadZone = PADDLE_SPEED * 0.80; //데드존
    if (Math.abs(targetY - paddleCenterY) <= deadZone) {
      return 'none';
    }

    return targetY < paddleCenterY ? 'up' : 'down';
  }

  // 오른쪽 패들(x 고정) 위치에 공이 도달할 때의 y를 벽 반사까지 고려해 예측한다.
  private predictImpactY(
    ballX: number,
    ballY: number,
    ballVx: number,
    ballVy: number,
  ): number {
    const rightPaddleLeftX = BOARD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
    const targetX = rightPaddleLeftX - BALL_RADIUS;

    // 공이 AI 쪽으로 오지 않을 때는 현재 y를 유지 목표로 삼아 불필요한 흔들림을 줄인다.
    if (ballVx <= 0) {
      return ballY;
    }

    const timeToImpact = (targetX - ballX) / ballVx;
    if (timeToImpact <= 0) {
      return ballY;
    }

    const travelHeight = BOARD_HEIGHT - BALL_RADIUS * 2;
    const rawY = (ballY - BALL_RADIUS) + ballVy * timeToImpact;
    const period = travelHeight * 2;
    let wrapped = rawY % period;
    if (wrapped < 0) wrapped += period;
    const reflected = wrapped <= travelHeight ? wrapped : period - wrapped;
    return reflected + BALL_RADIUS;
  }
}
