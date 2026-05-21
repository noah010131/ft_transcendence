import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { MatchmakingService } from './matchmaking.service';
import { FriendInviteService } from './friend-invite.service';

@Module({
  imports: [RedisModule],
  providers: [MatchmakingService, FriendInviteService],
  exports: [MatchmakingService, FriendInviteService],
})
export class MatchmakingModule {}
