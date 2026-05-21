/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game-history.controller.ts                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/14 20:53:39 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/15 20:59:59 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Controller, Get, Param } from '@nestjs/common';
import { GameHistoryService } from './game-history.service';

@Controller('games')
export class GameHistoryController {
  constructor(private readonly gameHistoryService: GameHistoryService) {}

  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.gameHistoryService.getHistoryByUserId(userId);
  }
}
