import { PresenceService } from './presence.service';
import type { PresenceRawEvent } from './presence.types';
type InvalidateFriendCacheBody = {
    userIds?: unknown;
};
export declare class PresenceController {
    private readonly presenceService;
    constructor(presenceService: PresenceService);
    getPresence(userId: string): Promise<{
        userId: string;
        connCount: number;
        flags: {
            matching: boolean;
            inGame: boolean;
        };
        internalStatus: import("./presence.types").PresenceState;
        publicStatus: import("./presence.types").PublicPresenceState;
    }>;
    publishEvent(event: PresenceRawEvent): Promise<{
        success: boolean;
    }>;
    invalidateFriendCache(body: InvalidateFriendCacheBody): Promise<{
        success: boolean;
    }>;
}
export {};
