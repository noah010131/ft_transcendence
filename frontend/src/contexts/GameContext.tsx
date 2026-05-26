/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameContext.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/15 14:52:48 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/18 15:13:23 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { createContext, useContext, useMemo, useEffect, useState, useCallback, ReactNode } from 'react';
import { useGame } from '../hooks/useGame';
import { useAuth } from './AuthContext';
import { GAME_INVITE_RECEIVED_EVENT, type GameInvitePayload } from '../types/presence';

// suna : 모달 표시 모드.
// queue-match : 일반 매칭 큐 진입 / ai-match : AI 매칭 / inviting : A 가 친구에게 초대 보낸 후 대기 / invited : B 가 초대 수신해 자동 입장
export type GameModalContext = 'queue-match' | 'ai-match' | 'inviting' | 'invited' | null;

type UseGameReturn = ReturnType<typeof useGame>;

interface GameContextValue extends UseGameReturn {
  // 기존 호환용 (HomePage 외부에서 직접 활성/비활성 호출하던 코드 보존)
  activateGameSocket: () => void;
  deactivateGameSocket: () => void;
  // suna : 모달 제어 + 매칭 시작점
  modalOpen: boolean;
  modalContext: GameModalContext;
  readySent: boolean;
  errorCode: string | null;
  invitedFrom: string | null;
  openMatchModal: (type: 'match' | 'ai') => void;
  startInvite: (targetUserId: string) => void;
  closeMatchModal: () => void;
  dismissModalForGameStart: () => void;
  handleReady: () => void;
  clearErrorCode: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // 소켓 연결 스위치 (기본값은 false)
  const [shouldConnect, setShouldConnect] = useState(false);

  const canConnect = useMemo(() => {
    return !!user && shouldConnect;
  }, [user, shouldConnect]);

  // useGame에 userId와 연결 스위치를 함께 전달
  const game = useGame(user?.userId ?? null, canConnect, user?.nickname);

  // suna : 모달/매칭 단계 상태를 Provider 로 끌어올림. 페이지 어디에서나 startGame/invite 가 동작.
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<GameModalContext>(null);
  const [readySent, setReadySent] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [invitedFrom, setInvitedFrom] = useState<string | null>(null);
  // suna : startInvite 가 activateGameSocket 호출 직후 inviteFriend 를 부르면 소켓 인스턴스가 아직 없어서 실패한다.
  // 대신 타겟만 저장하고, 소켓이 connected 가 되는 시점에 useEffect 가 한 번 emit 한다.
  const [pendingInviteTarget, setPendingInviteTarget] = useState<string | null>(null);

  // 1. 로그아웃 및 게임 종료 감지 로직
  useEffect(() => {
    // Case A: 사용자가 로그아웃했을 때
    if (!user) {
      // console.log('[GameProvider] 사용자가 로그아웃하여 세션을 정리합니다.');
      setShouldConnect(false);
      setModalOpen(false);
      setModalContext(null);
      setReadySent(false);
      setInvitedFrom(null);
      setPendingInviteTarget(null);
      game.resetGameState();
      return;
    }

    // Case B: 게임 결과(gameResult)가 나왔을 때 즉시 소켓 종료
    if (game.gameResult) {
      console.log('[GameProvider] 게임 종료 감지: 소켓 연결을 해제합니다.');
      setShouldConnect(false);
      // 참고: game.resetGameState()는 결과 화면을 보여줘야 하므로
      // 여기서 바로 부르지 말고, 유저가 '확인' 버튼을 누르거나 페이지를 나갈 때 부르는 게 좋습니다.
    }
  }, [user, game.gameResult]); // gameResult를 의존성에 추가!

  //  수동 종료 함수 (매칭 취소 시 사용)
  const deactivateGameSocket = useCallback(() => {
    setShouldConnect(false);
    game.resetGameState();
  }, [game]);

  // HomePage 등에서 호출할 "소켓 활성화" 함수
  const activateGameSocket = useCallback(() => {
    setShouldConnect(true);
  }, []);

  // suna : 모달을 닫고 매칭 관련 상태 전체 리셋. ESC 키 / 정상 종료 양쪽에서 호출.
  // deactivateGameSocket 으로 소켓도 끊기 때문에 게임이 시작된 뒤엔 절대 호출하면 안 된다.
  const closeMatchModal = useCallback(() => {
    setModalOpen(false);
    setModalContext(null);
    setReadySent(false);
    setInvitedFrom(null);
    setPendingInviteTarget(null);
    deactivateGameSocket();
  }, [deactivateGameSocket]);

  // suna : 첫 game_state 가 도착해 실제 게임이 시작됐을 때 호출.
  // 모달 UI 만 닫고 소켓/매칭 상태(matchInfo 등)는 그대로 두어 게임이 계속 돌게 한다.
  const dismissModalForGameStart = useCallback(() => {
    setModalOpen(false);
    setModalContext(null);
    setReadySent(false);
    setInvitedFrom(null);
    setPendingInviteTarget(null);
  }, []);

  // suna : HomePage 의 "매칭하기" / "AI 게임" 버튼이 호출. 소켓 활성화 + 모달 오픈.
  const openMatchModal = useCallback((type: 'match' | 'ai') => {
    if (!user?.userId) return;
    activateGameSocket();
    setReadySent(false);
    setInvitedFrom(null);
    setModalContext(type === 'ai' ? 'ai-match' : 'queue-match');
    setModalOpen(true);
  }, [activateGameSocket, user?.userId]);

  // suna : SocialPage 의 startGame 버튼이 호출. 소켓 활성화 + 모달 오픈만 하고, 실제 invite emit 은
  // pendingInviteTarget 을 보고 isConnected 가 true 가 됐을 때 아래 useEffect 에서 처리.
  const startInvite = useCallback((targetUserId: string) => {
    if (!user?.userId || !targetUserId) return;
    setReadySent(false);
    setInvitedFrom(null);
    setModalContext('inviting');
    setModalOpen(true);
    setPendingInviteTarget(targetUserId);
    activateGameSocket();
  }, [activateGameSocket, user?.userId]);

  // suna : "게임 시작" 버튼.
  const handleReady = useCallback(() => {
    game.sendReady();
    setReadySent(true);
  }, [game]);

  // suna : 새 매치(상대 ESC 후 재매칭 포함)가 잡히면 readySent 를 리셋.
  useEffect(() => {
    setReadySent(false);
  }, [game.matchInfo?.gameId]);

  // suna : 일반 매칭/AI/친구초대 모두 소켓이 연결된 시점에 emit. 큐 매칭과 동일한 패턴.
  useEffect(() => {
    if (!modalOpen || !game.isConnected) return;
    if (game.matchInfo) return;
    if (modalContext === 'queue-match') {
      game.joinQueue();
    } else if (modalContext === 'ai-match') {
      // suna : study 의 AI 게임 담당 코드가 aiGame 이라는 이름을 쓰고 있어 그쪽 명명에 맞춤.
      game.aiGame();
    } else if (modalContext === 'inviting' && pendingInviteTarget) {
      // suna : 소켓 연결 직후 1회만 emit. 클리어해서 중복 호출 방지.
      game.inviteFriend(pendingInviteTarget);
      setPendingInviteTarget(null);
    }
  }, [modalOpen, game.isConnected, modalContext, game.matchInfo, pendingInviteTarget, game.joinQueue, game.aiGame, game.inviteFriend]);

  // suna : 친구 초대 수신 시 자동으로 게임 소켓 활성화 + 모달 오픈.
  // B 의 game socket 이 연결되면 game-service 의 tryFulfillOnConnect 가 match_found 를 보낸다.
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<GameInvitePayload>).detail;
      if (!detail) return;
      console.log('[GameProvider] 친구 초대 수신:', detail);
      setReadySent(false);
      setInvitedFrom(detail.inviterNickname || detail.inviterUserId);
      setModalContext('invited');
      setModalOpen(true);
      setShouldConnect(true);
    };
    window.addEventListener(GAME_INVITE_RECEIVED_EVENT, handler);
    return () => {
      window.removeEventListener(GAME_INVITE_RECEIVED_EVENT, handler);
    };
  }, []);

  // suna : queueError 가 들어오면 alert 띄울 코드만 저장하고 모달은 닫는다.
  useEffect(() => {
    if (!game.queueError) return;
    const code = typeof game.queueError === 'string'
      ? game.queueError
      : (game.queueError as { code?: string }).code;
    setErrorCode(code ?? 'SERVER_ERROR');
    closeMatchModal();
    game.clearQueueError();
  }, [game.queueError, closeMatchModal, game.clearQueueError, game]);

  const clearErrorCode = useCallback(() => setErrorCode(null), []);

  // game 객체에 활성화 + 모달 메서드들을 합쳐서 전달
  const value = useMemo<GameContextValue>(() => ({
    ...game,
    activateGameSocket,
    deactivateGameSocket,
    modalOpen,
    modalContext,
    readySent,
    errorCode,
    invitedFrom,
    openMatchModal,
    startInvite,
    closeMatchModal,
    dismissModalForGameStart,
    handleReady,
    clearErrorCode,
  }), [
    game,
    activateGameSocket,
    deactivateGameSocket,
    modalOpen,
    modalContext,
    readySent,
    errorCode,
    invitedFrom,
    openMatchModal,
    startInvite,
    closeMatchModal,
    dismissModalForGameStart,
    handleReady,
    clearErrorCode,
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('GameProvider missing');
  return ctx;
};
