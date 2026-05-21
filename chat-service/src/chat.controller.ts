/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chat.controller.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/30 13:00:31 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/08 14:56:14 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import { 
  Controller, 
  Get, 
  Param, 
  Req, 
  UnauthorizedException, 
  Headers 
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request } from 'express';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private getCurrentUserId(req: Request): string {
    const userId = req.headers['x-user-id'];

    // 1. 존재 여부 확인, 2. 배열 여부 체크, 3. 공백 체크
    if (!userId || Array.isArray(userId) || userId.trim() === '') {
      throw new UnauthorizedException('유효하지 않은 유저 ID 헤더입니다.');
    }

    return userId.trim();
  }

  /**
   * 대화 내역 조회 API
   * GET http://localhost:8000/api/chat/history/:targetId
   */
  @Get('history/:targetId')
  async getHistory(
    @Req() req: Request, 
    @Param('targetId') targetId: string
  ) {
    // 중앙 함수를 통해 안전하게 ID 추출
    const myId = this.getCurrentUserId(req);
    
    // 서비스 로직 호출
    return await this.chatService.getDmHistory(myId, targetId);
  }

   /**
   * 상대방 상태조회 
   * GET http://localhost:8000/api/chat/status/:userId
   */
  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    const status = await this.chatService.getUserStatus(userId);
    return { status };
  }
  
  /**
   * 1. 특정 유저의 실시간 접속 상태(Redis) 확인
   * GET http://localhost:3002/debug/redis/:userId
   */
  @Get('debug/redis/:userId')
  async getRedisStatus(@Param('userId') userId: string) {
    const socketId = await this.chatService.getUserSocketId(userId);
    return {
      userId,
      socketId: socketId || 'OFFLINE',
    };
  }

  /**
   * 2. DB에 저장된 전체 대화 내역 확인 (테스트용)
   * GET http://localhost:2/debug/history/:user1/:user2
   */
  @Get('debug/history/:user1/:user2')
  async getHistoryForDebug(
    @Param('user1') user1: string,
    @Param('user2') user2: string,
  ) {
    const history = await this.chatService.getDmHistory(user1, user2);
    return {
      count: history.length,
      data: history,
    };
  }
}