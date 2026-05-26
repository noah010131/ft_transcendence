/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SocialPage.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 20:11:59 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/20 13:34:26 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useEffect, useCallback } from 'react';
import PageContainer from '../components/ui/PageContainer';
import FooterLinks from '../components/common/FooterLinks';
import Navbar from '../components/common/Navbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import ChatModal from '../components/ui/ChatModal';
import Alert from '../components/ui/Alert';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { userService } from '../services/userService';
import { friendService, type FriendItem } from '../services/friendService';
import { PRESENCE_UPDATED_EVENT } from '../types/presence';
import { useGameContext } from '../contexts/GameContext';
import { usePresenceStatus } from '../hooks/usePresenceStatus';
import { presenceStore } from '../services/presenceStore';

type PresenceUpdatedPayload = {
  userId: string;
  internalStatus: 'OFFLINE' | 'ONLINE' | 'MATCHING' | 'IN_GAME';
  publicStatus: 'OFFLINE' | 'ONLINE' | 'IN_GAME';
  at: string;
  version: 1;
};

function SocialPage() {
  const { theme } = useTheme();
  const { messages } = useI18n();

  // suna : 친구 startGame 버튼이 호출할 친구 초대 진입점.
  // 모달/소켓/이벤트 처리는 모두 GameProvider 가 담당하므로 페이지는 메서드만 호출.
  const { startInvite } = useGameContext();

  const [chatTarget, setChatTarget] = useState<{
  id: string;
  nickname: string;
  photo?: string;
} | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendItem[]>([]);
  const [nicknameInput, setNicknameInput] = useState('');
  // 백엔드 에러 코드를 그대로 저장 → 렌더 시 i18n으로 변환
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 에러 코드를 현재 언어 메세지로 변환. 알 수 없는 코드면 SERVER_ERROR로 fallback.
  const translateError = (code: string): string => {
    const errs = messages.errors as Record<string, string>;
    return errs[code] ?? errs.SERVER_ERROR;
  };

  // 친구/요청 목록 새로고침
  const refresh = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        friendService.getFriends(),
        friendService.getRequests(),
      ]);
      setFriends(f);
      // daeunki2추가 : 추가한 사유
      // usePresenceStatus의 초기 기본값(OFFLINE) 때문에 이벤트 도착 전 빨간불로 보이는 문제를 줄이기 위해
      // friends API가 제공한 현재 상태를 presenceStore 초기 시드로 먼저 반영한다.
      f.forEach((friend) => {
        presenceStore.set(friend.userId, friend.status);
      });
      setRequests(r);
    } catch (err: any) {
      console.error('Failed to load friends:', err);
    }
  }, []);

  // 마운트 시: 현재 사용자 id 조회 후 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const me = await userService.getMe();
        const uid = me?.user?.userId;
        if (typeof uid !== 'string') {
          console.error('[소셜] uid가 string이 아님, 중단', me);
          return;
        }
        setCurrentUserId(uid);
        await refresh();
      } catch (err) {
        console.error(err);
      }
    })();
  }, [refresh]);

  // presence.updated 실시간 구독: 친구 목록의 상태 점을 즉시 갱신
  useEffect(() => {
    const handlePresenceUpdated = (evt: Event) => {
      const event = (evt as CustomEvent<PresenceUpdatedPayload>).detail; // 누구의 상태가 무엇으로 바뀌었는지 
      if (!event) return;
      setFriends((prev) => // 친구목록에서 이벤트로 받은 아이디 찾아서 상태 변경
        prev.map((friend) =>
          friend.userId === event.userId
            ? { ...friend, status: event.publicStatus }
            : friend,
        ),
      );
    };
    // 상태변경 관련 이벤트 구독
    window.addEventListener(
      PRESENCE_UPDATED_EVENT,
      handlePresenceUpdated as EventListener,
    );
    // 이벤트 받아서 상태 받은 뒤에는 다시 새로운 이벤트를 받을 준비. 
    return () => {
      window.removeEventListener(
        PRESENCE_UPDATED_EVENT,
        handlePresenceUpdated as EventListener,
      );
    };
  }, []);

  // 친구 요청 보내기
  const handleSendRequest = async () => {
    console.log('[친구추가] 버튼 클릭됨, currentUserId:', currentUserId);
    if (currentUserId === null) {
      console.warn('[친구추가] currentUserId가 null이라 중단');
      return;
    }
    const nickname = nicknameInput.trim();
    if (!nickname) {
      setErrorCode('NICKNAME_REQUIRED');
      return;
    }
    try {
      await friendService.sendRequest(nickname);
      setNicknameInput('');
      await refresh();
      setSuccessMessage(messages.social.requestSent);
    } catch (err: any) {
      setErrorCode(err.message);
      await refresh();
    }
  };

  // 친구 요청 수락
  const handleAccept = async (friendId: number) => {
    if (currentUserId === null) return;
    try {
      await friendService.acceptRequest(friendId);
      await refresh();
    } catch (err: any) {
      setErrorCode(err.message);
      await refresh();
    }
  };

  // 친구 요청 거절
  const handleReject = async (friendId: number) => {
    if (currentUserId === null) return;
    try {
      await friendService.rejectRequest(friendId);
      await refresh();
    } catch (err: any) {
      setErrorCode(err.message);
      await refresh();
    }
  };

  // 친구 삭제
  const handleRemove = async (friendId: number) => {
    if (currentUserId === null) return;
    try {
      await friendService.removeFriend(friendId);
      await refresh();
    } catch (err: any) {
      setErrorCode(err.message);
      await refresh();
    }
  };
  // daeunki2추가 : 추가한 사유
  // 현재상태 표기를 서버 응답(friend.status) 대신 presenceStore 단일 소스로 읽기 위해 추가
  const targetStatus = usePresenceStatus(chatTarget?.id ?? null);
  return (
    <PageContainer
      header={<Navbar />}
      footer={<FooterLinks />}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
        }}
      >
        {/* 왼쪽: 기존 친구 목록 영역 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '32px', color: theme.colors.text, textAlign: 'center' }}>
            {messages.social.title}
          </h1>

          {/* 친구 추가 영역 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              placeholder={messages.social.addPlaceholder}
              style={{ flex: 1 }}
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendRequest();
              }}
            />
            <Button onClick={handleSendRequest}>{messages.social.add}</Button>
          </div>

          {/* 친구 목록 */}
          <Card>
          {friends.length === 0 ? (
            <p style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
              {messages.social.noFriends}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {friends.map((friend) => {
    			  // 💡 현재 접속한 도메인 기반으로 게이트웨이 주소 추출
    			  const gatewayDomain = window.location.origin.replace(':5173', ':8000');
    			  const formattedPhoto = friend.userPhoto?.startsWith('/')
    			    ? `${gatewayDomain}${friend.userPhoto}`
    			    : friend.userPhoto;
						
    			  return (
    			    <FriendRow
    			      key={friend.friendId}
    			      friend={friend}
    			      onOpenChat={() =>
    			        setChatTarget({
    			          id: friend.userId,
    			          nickname: friend.nickname,
    			          photo: formattedPhoto, // 💡 도메인이 조립된 풀 주소를 주입
    			        })
    			      }
    			      onRemove={() => handleRemove(friend.friendId)}
    			      onStartGame={() => startInvite(friend.userId)}
    			    />
    			  );
    			})}
            </div>
          )}
          </Card>
        </div>

        {/* 오른쪽: 친구 요청 카드 (작게) */}
        <div
          style={{
            width: '260px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* 왼쪽 title과 같은 높이의 invisible spacer — 카드 상단을 입력바에 정렬 */}
          <h1
            aria-hidden
            style={{
              margin: 0,
              fontSize: '32px',
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          >
            &nbsp;
          </h1>
          <Card style={{ padding: '16px' }}>
            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: theme.colors.text,
              }}
            >
              {messages.social.requestsTitle}
            </h2>

            {requests.length === 0 ? (
              <p
                style={{
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                {messages.social.noRequests}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {requests.map((req) => (
                  <div
                    key={req.friendId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 0',
                      borderBottom: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: '13px',
                        color: theme.colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {req.nickname}
                    </span>
                    <Button
                      onClick={() => handleAccept(req.friendId)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        minHeight: 'auto',
                      }}
                    >
                      {messages.social.accept}
                    </Button>
                    <Button
                      onClick={() => handleReject(req.friendId)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        minHeight: 'auto',
                        background: theme.colors.danger,
                        color: '#ffffff',
                      }}
                    >
                      {messages.social.reject}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ChatModal
        open={chatTarget !== null}
        onClose={() => setChatTarget(null)}
        targetId={chatTarget?.id ?? ''}
        friendName={chatTarget?.nickname ?? ''}
        friendPhoto={chatTarget?.photo}
        currentUserId={currentUserId}
        targetStatus={targetStatus}
      />

      <Alert
        open={errorCode !== null}
        title={messages.social.alertTitle}
        message={errorCode ? translateError(errorCode) : ''}
        confirmText={messages.result.false}
        onClose={() => setErrorCode(null)}
      />

      <Alert
        open={successMessage !== null}
        title={messages.result.success}
        message={successMessage ?? ''}
        confirmText={messages.result.false}
        onClose={() => setSuccessMessage(null)}
      />
    </PageContainer>
  );
}

export default SocialPage;

type FriendRowProps = {
  friend: FriendItem;
  onOpenChat: () => void;
  onRemove: () => void;
  // suna : 머지 때 누락된 친구초대 prop 추가. SocialPage 의 startInvite 를 그대로 전달.
  onStartGame: () => void;
};

function FriendRow({ friend, onOpenChat, onRemove, onStartGame }: FriendRowProps) {
  const { theme } = useTheme();
  const { messages } = useI18n();
  // daeunki2추가 : 추가한 사유
  // 훅 규칙을 지키면서 친구별 실시간 상태를 읽기 위해 row 컴포넌트 내부에서 usePresenceStatus를 호출
  const liveStatus = usePresenceStatus(friend.userId);

  const gatewayDomain = window.location.origin.replace(':5173', ':8000');
  const friendAvatarUrl = friend.userPhoto?.startsWith('/')
    ? `${gatewayDomain}${friend.userPhoto}`
    : friend.userPhoto;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 0',
        borderBottom: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Avatar url={friendAvatarUrl} />
        <span
          title={liveStatus === 'ONLINE' ? 'online' : liveStatus === 'IN_GAME' ? 'in_game' : 'offline'}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background:
              liveStatus === 'IN_GAME'
                ? '#f59e0b'
                : liveStatus === 'ONLINE'
                ? '#22c55e'
                : '#ef4444',
            border: `2px solid ${theme.colors.background}`,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <span style={{ flex: 1, fontSize: '16px', color: theme.colors.text }}>
        {friend.nickname}
      </span>
      <Button
        onClick={onOpenChat}
        style={{ fontSize: '12px', padding: '8px 12px', minHeight: 'auto' }}
      >
        {messages.social.sendMessage}
      </Button>
      {/* suna : 기존 onClick 없는 버튼 보존. */}
      {/* <Button style={{ fontSize: '12px', padding: '8px 12px', minHeight: 'auto' }}>
        {messages.social.startGame}
      </Button> */}
      {/* suna : 친구초대 호출 + ONLINE 일 때만 활성화. liveStatus 로 실시간 상태 반영. */}
      <Button
        onClick={onStartGame}
        disabled={liveStatus !== 'ONLINE'}
        style={{ fontSize: '12px', padding: '8px 12px', minHeight: 'auto' }}
      >
        {messages.social.startGame}
      </Button>
      <Button
        onClick={onRemove}
        style={{
          fontSize: '12px',
          padding: '8px 12px',
          minHeight: 'auto',
          background: theme.colors.danger,
          color: '#ffffff',
        }}
      >
        {messages.social.remove}
      </Button>
    </div>
  );
}
