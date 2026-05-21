export const PRESENCE_UPDATED_EVENT = 'presence:updated';
// suna : 친구 초대 wakeup. usePresenceSocket 이 서버 socket 의 'game.invite' 를 받아 window 로 재발행.
export const GAME_INVITE_RECEIVED_EVENT = 'game:invite:received';

export type PresenceStatus = 'OFFLINE' | 'ONLINE' | 'IN_GAME';

export type PresenceUpdatedEvent = {
  userId: string;
  publicStatus: PresenceStatus;
  internalStatus?: 'OFFLINE' | 'ONLINE' | 'MATCHING' | 'IN_GAME';
  at?: string;
  version?: number;
};

// suna : 'game.invite' 페이로드. gateway 가 game.invite.wakeup 을 받아 그대로 forward 한다.
export type GameInvitePayload = {
  targetUserId: string;
  inviterUserId: string;
  inviterNickname: string;
  at: string;
};
