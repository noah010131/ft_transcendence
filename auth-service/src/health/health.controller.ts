import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  // Liveness: 프로세스가 살아있는지만 확인 (의존성 체크 X)
  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  // Readiness: DB / Redis 연결까지 확인
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('auth-database', { timeout: 1500 }),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
