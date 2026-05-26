import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';
import { PresenceRedis } from './presence.redis';
export declare class PresenceSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly presenceService;
    private readonly presenceRedis;
    server: Server;
    private readonly socketUserMap;
    private readonly friendIdsFetchTimeoutMs;
    private readonly friendIdsFetchRetryCount;
    constructor(presenceService: PresenceService, presenceRedis: PresenceRedis);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    private extractAccessToken;
    private subscribePresenceUpdates;
    private subscribeGameInviteWakeup;
    private fetchFriendIds;
    private fetchFriendIdsOnce;
}
