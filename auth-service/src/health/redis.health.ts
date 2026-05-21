import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const ok = pong === 'PONG';
      const result = this.getStatus(key, ok);
      if (!ok) {
        throw new HealthCheckError('Redis ping did not return PONG', result);
      }
      return result;
    } catch (err) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
