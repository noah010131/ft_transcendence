export declare const PRESENCE_RAW_CHANNEL = "presence.raw";
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
