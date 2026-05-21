/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game-engine.service.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/13 21:16:16 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/14 21:56:03 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Injectable } from '@nestjs/common';
import {
	BALL_RADIUS,
	BOARD_HEIGHT,
	BOARD_WIDTH,
	INITIAL_BALL_SPEED_X,
	INITIAL_BALL_SPEED_Y,
	PADDLE_HEIGHT,
	PADDLE_MARGIN,
	PADDLE_SPEED,
	PADDLE_WIDTH,
	WIN_SCORE,
} from './game-engine.constants';
import type { EngineState, GameResult, PaddleDirection, PlayerSlot } from './game-engine.types';

@Injectable()
export class GameEngineService {
  // 게임 시작 시 기본 상태를 생성한다.
  // - 공/패들 위치는 중앙
  // - 점수는 0:0
  // - 공 속도는 상수값으로 초기화
  createInitialState(): EngineState {
    // daeunki2수정 : 수정이유
    // 매 게임 시작 시 초기 X/Y 방향을 랜덤 부호로 설정한다.
    const startDirX = Math.random() < 0.5 ? -1 : 1;
    const startDirY = Math.random() < 0.5 ? -1 : 1;
    return {
		ballX: BOARD_WIDTH / 2,
		ballY: BOARD_HEIGHT / 2,
		p1Y: (BOARD_HEIGHT - PADDLE_HEIGHT) / 2,
		p2Y: (BOARD_HEIGHT - PADDLE_HEIGHT) / 2,
		score1: 0,
		score2: 0,
		ballVx: INITIAL_BALL_SPEED_X * startDirX,
		ballVy: INITIAL_BALL_SPEED_Y * startDirY,
    };
  }

  // 패들 입력(위/아래)을 받아 해당 플레이어 패들의 Y만 변경한다.
  // 실제 이동 제한(화면 밖 방지)은 clampPaddleY에서 처리한다.
  movePaddle(state: EngineState, player: PlayerSlot, direction: PaddleDirection): EngineState {
    const delta = direction === 'up' ? -PADDLE_SPEED : PADDLE_SPEED; // 캔버스 좌표계라서 아래로 가야 y값이 증가함.  
    const next = { ...state }; // 다음의 상태
    if (player === 'p1') {
		next.p1Y = this.clampPaddleY(next.p1Y + delta); // 범위를 넘지 않도록 잡아줌
    } else {
		next.p2Y = this.clampPaddleY(next.p2Y + delta);
    }
    return next;
  }

  // 1틱(프레임) 게임 물리 업데이트.
  // 순서:
  // 1) 공 위치 이동
  // 2) 벽 충돌 처리
  // 3) 패들 충돌 처리
  // 4) 득점 처리 및 공 리셋
  updateTick(state: EngineState): EngineState {
    const next = { ...state };
    next.ballX += next.ballVx;
    next.ballY += next.ballVy;

    // 위/아래 벽 충돌:
    // 공 중심 + 반지름 기준으로 경계 초과를 검사하고 Y속도를 반전한다. >> 충돌각과 반사각이 같다.
    // 반전 뒤에는 경계 안쪽으로 위치를 보정해 떨림을 줄인다.
    if (next.ballY - BALL_RADIUS <= 0 || next.ballY + BALL_RADIUS >= BOARD_HEIGHT) {
      next.ballVy *= -1;
		next.ballY = Math.max(BALL_RADIUS, Math.min(BOARD_HEIGHT - BALL_RADIUS, next.ballY));
    }

    // 왼쪽 패들 충돌:
    // - 공이 왼쪽으로 이동 중(vx<0)일 때만 검사
    // - 패들 오른쪽 면 + 공 반지름 접점(대략 x=45) 기준으로 충돌 판정
    // - 충돌 시 공 위치를 접점으로 보정하고 X속도를 양수로 반전
    const leftPaddleRightX = PADDLE_MARGIN + PADDLE_WIDTH;
    const leftContactX = leftPaddleRightX + BALL_RADIUS;
    const hitLeftPaddle =
		next.ballVx < 0 &&
		next.ballX <= leftContactX &&
		next.ballX >= PADDLE_MARGIN &&
		next.ballY >= next.p1Y &&
		next.ballY <= next.p1Y + PADDLE_HEIGHT;
    if (hitLeftPaddle) {
		next.ballX = leftContactX;
		next.ballVx = Math.abs(next.ballVx);
    }

    // 오른쪽 패들 충돌:
    // - 공이 오른쪽으로 이동 중(vx>0)일 때만 검사
    // - 패들 왼쪽 면 - 공 반지름 접점에서 충돌 판정
    // - 충돌 시 공 위치를 접점으로 보정하고 X속도를 음수로 반전
    const rightPaddleLeftX = BOARD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
    const rightContactX = rightPaddleLeftX - BALL_RADIUS;
    const hitRightPaddle =
		next.ballVx > 0 &&
		next.ballX >= rightContactX &&
		next.ballX <= BOARD_WIDTH - PADDLE_MARGIN &&
		next.ballY >= next.p2Y &&
		next.ballY <= next.p2Y + PADDLE_HEIGHT;
    if (hitRightPaddle) {
		next.ballX = rightContactX;
		next.ballVx = -Math.abs(next.ballVx);
    }

    // 득점 처리:
    // - 공이 왼쪽 화면 밖으로 완전히 나가면 p2 득점
    // - 공이 오른쪽 화면 밖으로 완전히 나가면 p1 득점
    // 득점 후에는 공을 중앙으로 리셋한다.
    if (next.ballX + BALL_RADIUS < 0) {
		next.score2 += 1;
		return this.resetBall(next, -1);
    }
    if (next.ballX - BALL_RADIUS > BOARD_WIDTH) {
		next.score1 += 1;
		return this.resetBall(next, 1);
    }
    return next;
  }

  // 종료 판정:
  // 누군가 WIN_SCORE에 도달했으면 승자/스코어를 반환하고,
  // 아직 게임 중이면 null을 반환한다.
  getGameResultIfOver(state: EngineState, p1UserId: string, p2UserId: string): GameResult | null {
    if (state.score1 >= WIN_SCORE) {
		return { winnerId: p1UserId, score1: state.score1, score2: state.score2 };
    }
    if (state.score2 >= WIN_SCORE) {
		return { winnerId: p2UserId, score1: state.score1, score2: state.score2 };
    }
    return null;
  }

  // 패들이 화면 경계를 벗어나지 않도록 Y를 유효 범위로 고정한다.
  private clampPaddleY(y: number): number {
    return Math.max(0, Math.min(BOARD_HEIGHT - PADDLE_HEIGHT, y));
  }

  // 득점 후 재시작 때 X/Y 방향을 모두 랜덤화
  private resetBall(state: EngineState, toward: 1 | -1): EngineState {
    const nextDirX = Math.random() < 0.5 ? -1 : 1;
    const nextDirY = Math.random() < 0.5 ? -1 : 1;
    return {
		...state,
		ballX: BOARD_WIDTH / 2,
		ballY: BOARD_HEIGHT / 2,
		ballVx: Math.abs(INITIAL_BALL_SPEED_X) * nextDirX,
		ballVy: INITIAL_BALL_SPEED_Y * nextDirY,
    };
	}
}
