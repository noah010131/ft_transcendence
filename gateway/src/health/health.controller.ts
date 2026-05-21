import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  // Gateway readiness: 다운스트림 서비스의 readiness 까지 본다.
  // /health(liveness) 만 보면 프로세스만 살아있고 DB·Redis 등 의존성이 죽은 상태를
  // 못 잡아내서, 프론트의 ServiceGuard 가 잘못된 'up' 신호를 받게 된다.
  // /health/ready 를 핑해서 의존성까지 살아있는지 확인.
  // timeout 은 다운스트림의 DB ping(1500ms)보다 여유있게 잡는다.
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'auth-service',
          'http://auth-service:4000/health/ready',
          { timeout: 2500 },
        ),
      () =>
        this.http.pingCheck(
          'user-service',
          'http://user-service:4001/health/ready',
          { timeout: 2500 },
        ),
    ]);
  }
}
