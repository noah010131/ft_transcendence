/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game-engine.types.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/13 21:07:38 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/14 18:24:10 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


/*
프론트 소통용. 
*/
// 유저 히스토리용 (DB 저장/조회 응답)
export interface GameRecord {
  id: number;
  winnerNickname: string;//닉네임 변경이 가능하니까 id로 변경해야 될거 같음. 
  loserNickname: string;
  winnerScore: number;
  loserScore: number;
  playedAt: string; // ISO Date String
}

// 게임 중, 프론트 <-> 서버 소통 규격
export interface GameState {
  ballX: number; // 공 중심 X 좌표
  ballY: number; // 공 중심 Y 좌표
  p1Y: number; // 왼쪽 패들 Y
  p2Y: number; // 오른쪽 패들 Y
  score1: number; // p1 점수
  score2: number; // p2 점수
}

// 게임 끝난 후, 결과 띄우기 용
export interface GameResult {
  winnerId: string;
  score1: number;
  score2: number;
}

// 서버 -> 클라이언트: 매칭 완료
export interface MatchFoundPayload {
  gameId: string;
  playerSlot: PlayerSlot;
}

// 클라이언트 -> 서버: 패들 이동 입력
export interface MovePaddlePayload {
  direction: PaddleDirection;
}

// 서버 -> 클라이언트: 게임 종료
export interface GameOverPayload extends GameResult {
  gameId: string;
}

// ===== 서버 내부 엔진용 타입 =====

export type PaddleDirection = 'up' | 'down';
export type PlayerSlot = 'p1' | 'p2';

// 물리 계산에 필요한 내부 상태
export interface EngineState extends GameState {
  ballVx: number;
  ballVy: number;
}
