/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePresenceSocket.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/09 09:33:45 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/18 11:20:50 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { presenceStore } from '../services/presenceStore';
import {
  PRESENCE_UPDATED_EVENT,
  GAME_INVITE_RECEIVED_EVENT,
  type GameInvitePayload,
  type PresenceUpdatedEvent,
} from '../types/presence';

export const usePresenceSocket = (currentUserId: string | null) => {
  // 현재 활성 presence 소켓 인스턴스를 보관 >> 중복 연결 차단
  const socketRef = useRef<Socket | null>(null);
  //종료 사유 구분 플래그.
  const intentionalDisconnectRef = useRef(false);

  useEffect(() => {
    // 로그인 유저가 없으면 연결을 정리하고 캐시 상태도 비운다.
    if (!currentUserId) {
      // 로그아웃/세션만료로 인한 의도적 종료임을 먼저 기록한다.
      intentionalDisconnectRef.current = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      presenceStore.clear();
      return;
    }
    // 이미 연결이 살아 있으면 같은 유저에 대해 새 소켓을 만들지 않는다.
    if (socketRef.current) {
      return;
    }
    // 게이트웨이 presence 네임스페이스로 연결.
    // withCredentials: 쿠키(accessToken) 전달
    // forceNew: 훅 재진입 시 이전 매니저 재사용으로 인한 꼬임 방지
    // transports: polling -> websocket 업그레이드 경로를 열어 환경별 연결 안정성 확보
    // reconnection*: 무한 재시도 방지 + 재시도 간격 제어 숫자 변경 가능
    // suna : env 없으면 현재 접속 호스트의 8000 포트로 fallback (localhost / LAN IP 모두 대응).
    const gatewayOrigin =
      import.meta.env.VITE_API_BASE_URL ??
      `${window.location.protocol}//${window.location.hostname}:8000`;
    const socket = io(`${gatewayOrigin}/presence`, {
      withCredentials: true,
      forceNew: true,
      
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    // 소켓 인스턴스를 먼저 저장해 cleanup/다른 분기에서 안정적으로 접근 
    socketRef.current = socket;

    // 인증/권한 계열 에러는 굳이 재시도 하지 않음
    socket.on('connect_error', (err) => {
      console.error('[Presence] 연결 에러:', err.message);
      if (
        err.message.includes('authentication') ||
        err.message.includes('token') ||
        err.message.includes('Unauthorized') ||
        err.message.includes('401') ||
        err.message.includes('403')
      ) {
        console.warn('[Presence] 인증 문제로 재연결을 중단합니다.');
        socket.disconnect();
      }
    });

    // 설정한 재시도 횟수를 모두 소진하면 명시적으로 종료해 루프를 끝낸다.
    socket.on('reconnect_failed', () => {
      console.warn('[Presence] 재연결 시도 횟수 초과로 연결을 중단합니다.');
      socket.disconnect();
    });

    // 연결 성공 시 즉시 heartbeat를 보내 최초 online 반영 지연을 줄인다.
    socket.on('connect', () => {
      // 연결 직후에는 비의도 해제 플래그 상태로 복귀시켜 이후 끊김을 정확히 분류한다.
      intentionalDisconnectRef.current = false;
      console.log('[Presence] 연결 성공', {
        userId: currentUserId,
        socketId: socket.id,
      });
      socket.emit('presence.heartbeat');
    });

    // 연결이 내려갈 때 사유를 기록한다.
    // io server disconnect는 서버가 강제로 끊은 상태이므로 자동 복구를 기대하지 않고 종료한다.
    socket.on('disconnect', (reason) => {
      // 의도적 종료 플래그 기준으로 "로그아웃 해제"와 "끊김 해제"를 구분해 기록한다.
      if (intentionalDisconnectRef.current) {
        console.log('[Presence] 연결 해제: 로그아웃/의도적 종료', {
          userId: currentUserId,
          reason,
        });
      } else {
        console.log('[Presence] 연결 해제: 끊김/비의도 종료', {
          userId: currentUserId,
          reason,
        });
      }
      if (reason === 'io server disconnect') {
        socket.disconnect();
      }
    });

    // 서버에서 전달한 상태 이벤트를 전역 store에 반영한다.
    // 이후 화면 훅(usePresenceStatus)들이 이 값을 구독해 UI를 갱신한다.
    socket.on('presence.updated', (event: PresenceUpdatedEvent) => {
      if (!event?.userId || !event?.publicStatus) return;
      presenceStore.set(event.userId, event.publicStatus);
      // 기존 SocialPage 호환을 위해 커스텀 이벤트도 함께 발행한다.
      window.dispatchEvent(
        new CustomEvent(PRESENCE_UPDATED_EVENT, {
          detail: event,
        }),
      );
    });

    // suna : 친구 초대 wakeup 수신.
    // 본인이 target 인 경우에만 GameContext 가 게임 소켓을 활성화하도록 윈도우 이벤트로 재발행.
    socket.on('game.invite', (event: GameInvitePayload) => {
      if (!event?.targetUserId || event.targetUserId !== currentUserId) return;
      console.log('[Presence] game.invite 수신:', event);
      window.dispatchEvent(
        new CustomEvent(GAME_INVITE_RECEIVED_EVENT, {
          detail: event,
        }),
      );
    });

    // 주기 heartbeat: 연결 유지 + presence TTL 만료 방지.
    const heartbeatTimer = window.setInterval(() => {
      socket.emit('presence.heartbeat');
    }, 5000);

    return () => {
      // effect 종료 시 타이머 먼저 정리해 끊긴 소켓으로 emit되는 것을 막는다.
      window.clearInterval(heartbeatTimer);
      // 훅 정리로 인한 종료는 의도적 종료로 분류한다.
      intentionalDisconnectRef.current = true;
      // 모든 리스너를 제거해 재마운트 시 핸들러 중복을 방지한다.
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [currentUserId]);
};


/*
현재 상태 시스템은 여러 서비스에서 상태 변화를 발생시킴

1. 인증/접속 > 게이트웨이
2. 소켓 연결 해제 > 게이트웨이
3. 게임 상태 변화 > 게임서비스
이 변화들은 이벤트 발행/구독(pub/sub)으로 전달되고, gateway presence가 이를 받아 최신 상태로 정규화.
정규화된 상태 이벤트는 다시 프론트로 전달.

동작 흐름:

1. 게이트웨이/ 게임서비스가 상태 이벤트를 Redis 채널에 publish (이벤트 발생시 보낼 준비)
2. gateway presence socket이 Redis 채널을 subscribe (보낸 이벤트들을 받을 준비)
3. 최신 상태로 정규화 
4. 구독한 이벤트를 클라이언트로 presence.updated emit (최신상태에 변화가 있을때만 프론트로 전송)
5. 프론트는 이를 받아 store에 반영 (한 곳에 박아두고 사용하게, 상태변화가 있으면 재랜더 하게)
6. 소셜/채팅 등 각 페이지는 store를 구독해 동일한 상태를 표시(일괄적용)

기존 채팅 서비스는 상태 이벤트를 직접 구독/중계하는 방식이었습니다.
이 때문에 presence 소켓 경로와 chat 소켓 경로가 동시에 존재해, 같은 상태를 2곳에서 받는 구조였습니다.

치명적 장애를 만든 구조는 아니었지만, 소켓 책임을 명확히 하기 위해 분리했습니다.

presence 소켓: 상태 전파 전담
chat 소켓: 채팅 메시지 전담
결과적으로 역할 분리가 명확해지고, 상태 표시 경로도 단일화되어 유지보수와 디버깅이 쉬워졌습니다.
*/