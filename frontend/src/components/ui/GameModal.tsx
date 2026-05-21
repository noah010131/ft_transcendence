/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameModal.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/11 20:59:15 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/14 18:20:47 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';

// suna : Provider 의 GameModalContext 와 동일하나, 모달 컴포넌트는 contexts 의존을 갖지 않도록 별도 타입.
type ModalPhase = 'queue-match' | 'ai-match' | 'inviting' | 'invited' | null;

interface GameMatchModalProps {
  open: boolean;
  isConnected: boolean;
//   onClose: () => void;
  gameType?: 'match' | 'ai' | null;
  // daeunki2수정 : 수정이유
  // 부모(HomePage)에서 onClose를 전달하고 있으므로 props 타입에도 명시해 타입 불일치(암묵 any/속성 누락)를 방지
  onClose: () => void;
  // suna : match_found 후 모달이 "게임 시작" 단계로 전환되기 위한 추가 props.
  matched?: boolean;
  readySent?: boolean;
  onReady?: () => void;
  // suna : 매칭 전 단계(queue/ai/inviting/invited)를 구분하는 컨텍스트.
  modalContext?: ModalPhase;
}

export default function GameMatchModal({
  open,
  isConnected,
  gameType,
  onClose,
  matched,
  readySent,
  onReady,
  modalContext,
}: GameMatchModalProps) {
  const { theme } = useTheme();
  const { messages } = useI18n();

  const handleDoNothing = () => {};

  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  const getStatusMessage = () => {
    if (!isConnected) {
      return messages.game.connectGameServer;
    }
    // suna : 매칭이 완료된 단계에서는 내 ready 여부에 따라 안내 문구를 바꾼다.
    if (matched) {
      if (readySent) return messages.game.waitingOpponentReady;
      return messages.game.matchFoundReady;
    }
    // suna : 친구 초대 단계별 문구.
    if (modalContext === 'inviting') return messages.game.invitingFriend;
    if (modalContext === 'invited') return messages.game.invitedByFriend;
    if (modalContext === 'ai-match' || gameType === 'ai') {
      return messages.game.preparingAiMatch;
    }
    return messages.game.connectGameJoin;
  };

  // suna : 매칭 완료 + 내가 아직 ready 안 누른 상태에서만 "게임 시작" 버튼을 보여준다.
  const showStartButton = Boolean(matched && !readySent && onReady);

  return (
    <Modal open={open} onClose={handleDoNothing} closeOnOverlayClick={false}>
	  <style>{spinKeyframes}</style>
      <div
        style={{
          padding: '40px',
          color: theme.colors.text,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* suna : 매칭 전엔 스피너, 매칭 완료 후엔 숨김. */}
        {!matched && (
          <div style={{
            width: '50px',
            height: '50px',
            border: `5px solid ${theme.colors.textMuted}33`,
            borderTop: `5px solid ${theme.colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}

        <h2 style={{ margin: 0 }}>
          {getStatusMessage()}
        </h2>

        {showStartButton && (
          <Button onClick={onReady} style={{ minWidth: '200px' }}>
            {messages.game.startGameButton}
          </Button>
        )}

        {/* suna : ESC 안내문은 매칭 단계와 ready 대기 단계 모두에서 유효. */}
        <small style={{ color: theme.colors.textMuted, fontSize: '12px' }}>
          {messages.HomePage.escCancel}
        </small>
      </div>
    </Modal>
  );
}
