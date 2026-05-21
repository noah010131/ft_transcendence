import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { Friend } from '../entities/friend.entity';
import { FriendsModule } from '../friends/friends.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '../health/health.module';


@Module({
  imports: [

	ConfigModule.forRoot({ // 다른 모듈에서도 .env변수 사용위함
      isGlobal: true, 
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'user-database',
      port: 5432,
      username: process.env.USERDB_USER, // .env 에서 주입
      password: process.env.USERDB_PASSWORD, // .env 에서 주입
      database: 'user-db', // 본인의 DB 이름
      entities: [User, Friend], // 우리가 만든 Entity 등록
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
    }),
    TypeOrmModule.forFeature([User]), // Repository를 쓰기 위해 필요

    JwtModule.register({
      secret: process.env.MY_SECRET_KEY, // .env 파일로 생성해야함!
      signOptions: { expiresIn: '1h' }, // 토큰 유효 기간 (1시간)
    }),

    FriendsModule, // 친구 기능 모듈
    HealthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
