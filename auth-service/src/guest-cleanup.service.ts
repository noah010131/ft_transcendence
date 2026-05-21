import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Auth } from './entities/auth.entity';
import { RefreshSession } from './entities/refresh-session.entity';

// 만료된 게스트 row 를 주기적으로 삭제.
// 흐름:
//   1. refresh_sessions 만료된 것 중 owner 가 role='guest' 인 row 찾기
//   2. user-service 에 DELETE /internal/users/:userId
//   3. auth-service 에서 refresh_sessions + auth row 삭제 (auth 의 onDelete CASCADE 가 refresh_sessions 도 같이 정리)
// 부분 실패 — 다음 cron 주기에 재시도. row 가 만료된 채 남아있으니 self-healing.
@Injectable()
export class GuestCleanupService {
  private readonly logger = new Logger(GuestCleanupService.name);

  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // 10분마다 실행. CRON_EVERY_10_MINUTES = '0 */10 * * * *' (sec min hour ...)
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredGuests() {
    const now = new Date();

    // 만료된 refresh_sessions → user_id 모음.
    const expiredSessions = await this.refreshSessionRepository.find({
      where: { expiresAt: LessThan(now) },
      select: ['id', 'userId'],
    });
    if (expiredSessions.length === 0) return;

    const userIds = Array.from(new Set(expiredSessions.map((s) => s.userId)));

    // 그 중 role='guest' 인 auth row 만 추림 (일반 유저의 만료 세션은 건드리지 않음).
    const guestAuths = await this.authRepository
      .createQueryBuilder('auth')
      .where('auth.id IN (:...ids)', { ids: userIds })
      .andWhere('auth.role = :role', { role: 'guest' })
      .getMany();
    if (guestAuths.length === 0) return;

    this.logger.log(`만료 게스트 ${guestAuths.length}명 정리 시작`);

    const userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ?? 'http://user-service:4001';
    const internalSecret = this.configService.get<string>('INTERNAL_SECRET');

    for (const auth of guestAuths) {
      try {
        await firstValueFrom(
          this.httpService.delete(`${userServiceUrl}/internal/users/${auth.id}`, {
            headers: internalSecret ? { 'x-internal-secret': internalSecret } : {},
          }),
        );
      } catch (error: any) {
        // user-service 가 죽었거나 일시 장애 — 다음 주기에 재시도. auth row 는 남겨둠.
        this.logger.warn(
          `user-service 게스트 삭제 실패 (${auth.id}): ${error.response?.status ?? error.code ?? error.message}`,
        );
        continue;
      }

      // user-service 정리 성공 후에만 auth row 삭제. CASCADE 로 refresh_sessions 도 같이 사라짐.
      await this.authRepository.delete({ id: auth.id });
    }

    this.logger.log('만료 게스트 정리 완료');
  }
}
