import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { GameGateway } from './game.gateway';
// merge수정 : main의 Redis 기반 매칭 모듈을 유지함.
import { RedisModule } from './redis/redis.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
// merge수정 : daeunki2의 실제 게임 엔진/기록 조회 기능을 함께 등록함.
import { GameEngineService } from './engine/game-engine.service'; // daeunki2 추가 : 게임 로직 추가
import { GameRecordEntity } from './game-record.entity';
import { GameHistoryService } from './game-history.service';
import { GameHistoryController } from './game-history.controller';
import { GameRuntimeService } from './engine/game-runtime.service';
import { AiBotService } from './engine/ai-bot.service';
import { AiRuntimeAdapter } from './engine/ai-runtime.adapter';
import { GameAiGatewayHelper } from './game-ai.gateway.helper';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'game-database',
      port: 5432,
      username: process.env.GAMEDB_USER,
      password: process.env.GAMEDB_PASSWORD,
      database: 'game-db',
      entities: [GameRecordEntity], // daeunki2수정 : 수정이유 - 게임 결과를 DB 테이블에 영속 저장
      synchronize: true,
    }),
    TypeOrmModule.forFeature([GameRecordEntity]), // daeunki2수정 : 수정이유 - Gateway에서 결과 저장용 Repository 주입
    HealthModule,
    RedisModule,
    MatchmakingModule,
  ],
  controllers: [GameHistoryController], // daeunki2수정 : 수정이유 - 게임 히스토리 조회 API 노출
  // merge수정 : Gateway에서 분리한 실제 게임 루프/재연결/기록 저장 Runtime 서비스를 provider로 등록함.
  providers: [
    GameGateway,
    GameEngineService,
    GameHistoryService,
    GameRuntimeService,
    AiBotService,
    AiRuntimeAdapter,
    GameAiGatewayHelper,
  ],
})
export class AppModule {}
