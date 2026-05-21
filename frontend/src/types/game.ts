/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/12 11:46:32 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/12 15:22:08 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// 유저 히스토리용
export interface GameRecord {
  id: number;
  winnerNickname: string;
  loserNickname: string;
  winnerScore: number;
  loserScore: number;
  playedAt: string; // ISO Date String
}

// 게임 중, 프론트 <-> 서버 소통 규격
export interface GameState {
  ballX: number;	// 공 좌표
  ballY: number;
  p1Y: number;		// 플레이어 1, 2 좌표(위 아래여서 Y자표로 충분)
  p2Y: number;
  score1: number;	//스코어
  score2: number;
}

// 게임 끝난 후, 결과 띄우기 용 
export interface GameResult {
  winnerId: string;
  score1: number;
  score2: number;
}