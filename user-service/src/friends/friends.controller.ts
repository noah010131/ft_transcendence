// src/friends/friends.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FriendsService } from './friends.service';

interface SendRequestDto {
  nickname?: unknown;
}

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  private getCurrentUserId(req: Request): string {
    const raw = req.headers['x-user-id'];
    if (!raw || Array.isArray(raw) || raw.trim() === '') {
      throw new UnauthorizedException('x-user-id header required (temp)');
    }
    return raw;
  }

  // 내 친구 목록
  @Get()
  async getFriends(@Req() req: Request) {
    const userId = this.getCurrentUserId(req);
    const friends = await this.friendsService.getFriends(userId);
    return { success: true, friends };
  }

  // 내부용: presence fan-out을 위한 친구 userId 목록
  @Get('internal/:userId/ids')
  async getFriendIdsForPresence(@Param('userId') userId: string) {
    const friendIds = await this.friendsService.getAcceptedFriendUserIds(userId);
    return { success: true, friendIds };
  }

  // 내가 받은 친구 요청 목록
  @Get('requests')
  async getRequests(@Req() req: Request) {
    const userId = this.getCurrentUserId(req);
    const requests = await this.friendsService.getReceivedRequests(userId);
    return { success: true, requests };
  }

  // 친구 요청 보내기
  @Post('requests')
  async sendRequest(@Req() req: Request, @Body() body: SendRequestDto) {
    const userId = this.getCurrentUserId(req);
    if (typeof body?.nickname !== 'string' || body.nickname.trim() === '') {
      throw new BadRequestException('NICKNAME_REQUIRED');
    }
    const request = await this.friendsService.sendRequest(userId, body.nickname.trim());
    return { success: true, request };
  }

  // 친구 요청 수락
  @Patch('requests/:id')
  async acceptRequest(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getCurrentUserId(req);
    const request = await this.friendsService.acceptRequest(userId, id);
    return { success: true, request };
  }

  // 친구 요청 거절
  @Delete('requests/:id')
  async rejectRequest(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getCurrentUserId(req);
    await this.friendsService.rejectRequest(userId, id);
    return { success: true };
  }

  // 친구 삭제
  @Delete(':id')
  async removeFriend(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getCurrentUserId(req);
    await this.friendsService.removeFriend(userId, id);
    return { success: true };
  }
}
