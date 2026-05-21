/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game-history.service.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/14 20:53:44 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/14 21:35:07 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRecordEntity } from './game-record.entity';

type GameRecordResponse = {
  id: number;
  winnerNickname: string;
  loserNickname: string;
  winnerScore: number;
  loserScore: number;
  playedAt: string;
};

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(GameRecordEntity)
    private readonly gameRecordRepository: Repository<GameRecordEntity>,
  ) {}

  async getHistoryByUserId(userId: string): Promise<GameRecordResponse[]> {
    // 프론트 유저 히스토리 화면에서 winner/loser 형태를 바로 쓰도록
    // DB 레코드를 응답 DTO(GameRecord) 형식으로 가공한다.
    const records = await this.gameRecordRepository.find({
      where: [{ player1Id: userId }, { player2Id: userId }],
      order: { playedAt: 'DESC' },
    });

    return records.map((record) => {
      const winnerScore =
        record.winnerId === record.player1Id ? record.player1Score : record.player2Score;
      const loserScore =
        record.winnerId === record.player1Id ? record.player2Score : record.player1Score;
      return {
        id: record.id,
        winnerNickname: record.winnerNickname,
        loserNickname: record.loserNickname,
        winnerScore,
        loserScore,
        playedAt: record.playedAt.toISOString(),
      };
    });
  }
}
