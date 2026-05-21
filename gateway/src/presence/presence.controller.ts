import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import type { PresenceRawEvent } from './presence.types';

type InvalidateFriendCacheBody = {
  userIds?: unknown;
};

@Controller('internal/presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get(':userId')
  async getPresence(@Param('userId') userId: string) {
    return this.presenceService.getPresence(userId);
  }

  @Post('events')
  async publishEvent(@Body() event: PresenceRawEvent) {
    await this.presenceService.publishRawEvent(event);
    return { success: true };
  }

  @Post('friends-cache/invalidate')
  async invalidateFriendCache(
    @Body() body: InvalidateFriendCacheBody,
  ) {
    if (!Array.isArray(body.userIds)) {
      throw new BadRequestException('USER_IDS_REQUIRED');
    }

    const userIds = body.userIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    );
    if (userIds.length === 0) {
      throw new BadRequestException('USER_IDS_REQUIRED');
    }

    await this.presenceService.invalidateFriendCaches(userIds);
    return { success: true };
  }
}
