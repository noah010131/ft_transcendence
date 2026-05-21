import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PresenceController } from './presence.controller';
import { PresenceRedis } from './presence.redis';
import { PresenceService } from './presence.service';
import { PresenceSocketGateway } from './presence.socket.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.MY_SECRET_KEY,
    }),
  ],
  controllers: [PresenceController],
  providers: [PresenceRedis, PresenceService, PresenceSocketGateway],
  exports: [PresenceService],
})
export class PresenceModule implements OnModuleInit {
  constructor(private readonly presenceService: PresenceService) {}

  async onModuleInit() {
    await this.presenceService.startRawEventConsumer();
    this.presenceService.startHeartbeatReconciler();
  }
}
