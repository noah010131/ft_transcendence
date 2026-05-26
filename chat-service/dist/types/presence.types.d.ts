export declare const PRESENCE_RAW_CHANNEL = "presence.raw";
export declare const PRESENCE_UPDATED_CHANNEL = "presence.updated";
export type PresenceState = 'OFFLINE' | 'ONLINE' | 'MATCHING' | 'IN_GAME';
export type PublicPresenceState = 'OFFLINE' | 'ONLINE' | 'IN_GAME';
export type PresenceEventType = 'connected' | 'disconnected' | 'matching_started' | 'matching_ended' | 'game_started' | 'game_ended';
export type PresenceEventSource = 'gateway' | 'auth-service' | 'user-service' | 'game-service' | 'chat-service';
export interface PresenceRawEvent {
    eventId: string;
    userId: string;
    type: PresenceEventType;
    source: PresenceEventSource;
    seq: number;
    at: string;
    version: 1;
    meta?: Record<string, unknown>;
}
export interface PresenceUpdatedEvent {
    userId: string;
    internalStatus: PresenceState;
    publicStatus: PublicPresenceState;
    at: string;
    version: 1;
}
