import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { MatchmakingService } from './matchmaking/matchmaking.service';
import { FriendInviteService } from './matchmaking/friend-invite.service';
import { GameRedis } from './redis/game.redis';
import { GameRuntimeService } from './engine/game-runtime.service';
import { GameAiGatewayHelper } from './game-ai.gateway.helper';
import type { MovePaddlePayload } from './engine/game-engine.types';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchmaking;
    private readonly gameRedis;
    private readonly gameRuntime;
    private readonly friendInvite;
    private readonly gameAiHelper;
    server: Namespace;
    constructor(matchmaking: MatchmakingService, gameRedis: GameRedis, gameRuntime: GameRuntimeService, friendInvite: FriendInviteService, gameAiHelper: GameAiGatewayHelper);
    onMovePaddle(client: Socket, payload: MovePaddlePayload): void;
    onReady(client: Socket): Promise<void>;
    onInviteFriend(client: Socket, payload: {
        targetUserId?: string;
    }): Promise<void>;
    private extractUserId;
    private extractIsGuest;
    private extractNickname;
    handleConnection(client: Socket): void;
    private evictDuplicateSockets;
    handleDisconnect(client: Socket): Promise<void>;
    private handleSurvivor;
    onStartAiGame(client: Socket, payload: {
        gameType?: string;
    }): Promise<void>;
    onJoinQueue(client: Socket): Promise<void>;
}
