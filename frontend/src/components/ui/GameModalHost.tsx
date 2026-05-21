/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameModalHost.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: suna <suna@student.42.fr>                  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameMatchModal from './GameModal';
import Alert from './Alert';
import { useGameContext } from '../../contexts/GameContext';
import { useI18n } from '../../i18n/useI18n';

// suna : BrowserRouter 내부에서 useNavigate 를 쓰기 위해 분리한 호스트.
// GameProvider 는 Provider 라이프사이클(외부)에 있고, 이 컴포넌트는 Router 내부에서 렌더되어
// 모달 + 에러 알림 + gameState 도착 시 /game 으로 이동을 담당.
export default function GameModalHost() {
  const navigate = useNavigate();
  const { messages } = useI18n();
  const {
    modalOpen,
    modalContext,
    readySent,
    errorCode,
    handleReady,
    closeMatchModal,
    dismissModalForGameStart,
    clearErrorCode,
    isConnected,
    matchInfo,
    gameState,
  } = useGameContext();

  // suna : ESC 로 모달 닫기 (모달 오픈 상태일 때만 등록).
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMatchModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, closeMatchModal]);

  // suna : 양쪽 ready 후 첫 game_state 가 도착하면 모달 닫고 /game 으로 이동.
  // closeMatchModal 은 소켓까지 끊으므로 절대 호출하지 않고, dismissModalForGameStart 로 UI 만 정리.
  useEffect(() => {
    if (gameState) {
      dismissModalForGameStart();
      navigate('/game');
    }
  }, [gameState, navigate, dismissModalForGameStart]);

  const translateError = (code: string): string => {
    const errs = messages.errors as Record<string, string | undefined>;
    return errs[code] ?? errs.SERVER_ERROR ?? code;
  };

  return (
    <>
      <GameMatchModal
        open={modalOpen}
        isConnected={isConnected}
        onClose={closeMatchModal}
        gameType={modalContext === 'ai-match' ? 'ai' : 'match'}
        modalContext={modalContext}
        matched={Boolean(matchInfo)}
        readySent={readySent}
        onReady={handleReady}
      />
      <Alert
        open={errorCode !== null}
        title={messages.social.alertTitle}
        message={errorCode ? translateError(errorCode) : ''}
        confirmText={messages.result.false}
        onClose={clearErrorCode}
      />
    </>
  );
}
