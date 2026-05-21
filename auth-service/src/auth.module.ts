import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GuestCleanupService } from './guest-cleanup.service';
import { Auth } from './entities/auth.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';


@Module({
  imports: [

	ConfigModule.forRoot({ // 다른 모듈에서도 .env변수 사용위함
      isGlobal: true, 
    }),

    // HttpModule 추가 (다른 서비스 API 호출용)
    HttpModule.register({
      timeout: 5000,     // 5초 타임아웃 설정 (선택사항)
      maxRedirects: 5,   // 최대 리다이렉트 횟수 (선택사항)
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'auth-database',
      port: 5432,
      username: process.env.AUTHDB_USER, // .env 에서 주입
      password: process.env.AUTHDB_PASSWORD, // .env 에서 주입
      database: 'auth-db', // DB 이름
      entities: [Auth, RefreshSession], // 우리가 만든 Entity 등록 + 리프레시 추가
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
    }),
    TypeOrmModule.forFeature([Auth, RefreshSession]), // Repository를 쓰기 위해 필요 + 리프레시 추가

	JwtModule.register({
      secret: process.env.MY_SECRET_KEY, // .env 파일로 생성해야함!
      signOptions: { expiresIn: '1h' }, // 토큰 유효 기간 (1시간)
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    HealthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GuestCleanupService],
})
export class AuthModule {}
