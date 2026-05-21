/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   presence.types.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/02 21:41:15 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/02 21:44:04 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const PRESENCE_RAW_CHANNEL = 'presence.raw';
export const PRESENCE_UPDATED_CHANNEL = 'presence.updated';

export type PresenceState = 'OFFLINE' | 'ONLINE' | 'MATCHING' | 'IN_GAME'; //내부
export type PublicPresenceState = 'OFFLINE' | 'ONLINE' | 'IN_GAME'; //외부


//4개의 이벤트 시작과 끝
export type PresenceEventType =
  | 'connected' // 실제 연결상태
  | 'disconnected'
  | 'matching_started'
  | 'matching_ended'
  | 'game_started'
  | 'game_ended';

//이벤트 발행은 각 서비스에서 한다.  
export type PresenceEventSource =
  | 'gateway'
  | 'auth-service'
  | 'user-service'
  | 'game-service'
  | 'chat-service';

// 최초 발행
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

// 이벤트 발행
export interface PresenceUpdatedEvent {
  userId: string;
  internalStatus: PresenceState;
  publicStatus: PublicPresenceState;
  at: string;
  version: 1;
}
