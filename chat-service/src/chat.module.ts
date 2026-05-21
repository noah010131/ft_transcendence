import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatRepository } from './repository/chat.repository';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from './entities/chat.entity'; // 엔티티 확인!
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { HttpModule } from '@nestjs/axios'
import Redis from 'ioredis';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,

    // 1. 여기서 DB 연결 설정을 직접 합니다 (forRoot)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'chat-database', // 채팅 전용 DB 호스트
      port: 5432,
      username: process.env.CHATDB_USER,
      password: process.env.CHATDB_PASSWORD,
      database: 'chat-db',
      entities: [ChatMessage], 
      synchronize: true,
    }),

    // 2. Repository 사용을 위해 엔티티 등록 (forFeature)
    TypeOrmModule.forFeature([ChatMessage]),
    HealthModule,
  ],
  controllers: [ChatController], // 컨트롤러 있으면 추가
  providers: [
	ChatGateway,
    ChatService, 
    ChatRepository,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: 'redis', // redis 서비스 이름
          port: 6379,
        });
      },
    },
    {
      provide: 'REDIS_SUB',
      useFactory: () => {
        return new Redis({
          host: 'redis',
          port: 6379,
        });
      },
    },
  ],
})
export class ChatModule {}