// 이유: gateway/chat-service와 동일한 presence raw 채널 스키마로 발행하기 위함.
// presence 상태 자체는 gateway에서 계산하고, 여기서는 4개 이벤트만 발행한다:
// matching_started / matching_ended / game_started / game_ended
// gateway/src/presence/presence.types.ts 와 동일하게 유지해야 한다.

export const PRESENCE_RAW_CHANNEL = 'presence.raw';

export type PresenceEventType =
  | 'connected'
  | 'disconnected'
  | 'matching_started'
  | 'matching_ended'
  | 'game_started'
  | 'game_ended';

export type PresenceEventSource =
  | 'gateway'
  | 'auth-service'
  | 'user-service'
  | 'game-service'
  | 'chat-service';

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
