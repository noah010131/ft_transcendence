import { OnModuleDestroy } from '@nestjs/common';
import { PresenceRawEvent, PresenceState, PublicPresenceState } from './presence.types';
import { PresenceRedis } from './presence.redis';
export declare class PresenceService implements OnModuleDestroy {
    private readonly redis;
    private readonly heartbeatTtlSec;
    private readonly heartbeatSweepMs;
    private heartbeatSweepTimer;
    constructor(redis: PresenceRedis);
    publishRawEvent(event: PresenceRawEvent): Promise<void>;
    publishGatewayConnectionEvent(userId: string, type: 'connected' | 'disconnected', socketId: string): Promise<void>;
    markHeartbeat(userId: string, socketId: string): Promise<void>;
    startRawEventConsumer(): Promise<void>;
    startHeartbeatReconciler(): void;
    getPresence(userId: string): Promise<{
        userId: string;
        connCount: number;
        flags: {
            matching: boolean;
            inGame: boolean;
        };
        internalStatus: PresenceState;
        publicStatus: PublicPresenceState;
    }>;
    invalidateFriendCaches(userIds: string[]): Promise<void>;
    private handleRawEvent;
    private applyEventToStorage;
    private recomputeEffectiveStatus;
    private toPublicStatus;
    private parseEvent;
    private isEventFresh;
    private reconcileHeartbeatTimeouts;
    private extractSocketId;
    onModuleDestroy(): void;
}
