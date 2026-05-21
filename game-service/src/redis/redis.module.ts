import { Module } from '@nestjs/common';
import { GameRedis } from './game.redis';

@Module({
  providers: [GameRedis],
  exports: [GameRedis],
})
export class RedisModule {}
