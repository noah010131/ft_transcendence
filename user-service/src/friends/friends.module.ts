// src/friends/friends.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from '../entities/friend.entity';
import { User } from '../entities/user.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, User])],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
