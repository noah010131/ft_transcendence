/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChatModal.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/01 10:55:27 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/08 10:38:52 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import { useState, useRef, useEffect, type CSSProperties } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Avatar from './Avatar';
import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';
import { useChat } from '../../hooks/useChat'; // ✅ 만든 훅 임포

type ChatModalProps = {
  open: boolean;
  onClose: () => void
  targetId: string;
  friendName: string;
  friendPhoto?: string;
  currentUserId: string | null;
  targetStatus: 'OFFLINE' | 'ONLINE' | 'IN_GAME';
};

export default function ChatModal({ open, onClose, targetId, friendName, friendPhoto, currentUserId, targetStatus }: ChatModalProps) {
  const { theme } = useTheme();
  const { messages: i18n } = useI18n();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ 실시간 채팅 훅 연결
  // 모달이 열려 있을 때만 friendName을 전달하여 소켓 연결을 시작합니다.
  const { messages, sendMessage, isConnected} = useChat(
    open ? targetId : null,
    currentUserId
  );

  // ✅ 새 메시지가 올 때마다 하단으로 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || !isConnected) return;
    sendMessage(inputText);
    setInputText('');
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderBottom: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px', // 적절한 최대 높이 설정
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
  };

  const bubbleBase: CSSProperties = {
    maxWidth: '75%',
    padding: '8px 12px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  };

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ position: 'relative' }}>
          <Avatar size={32} url={friendPhoto}/>
          {/* ✅ 실시간 연결 상태 표시 점 */}
          <span style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 
              targetStatus === 'ONLINE' ? '#22c55e' :
              targetStatus === 'IN_GAME' ? '#f59e0b' :'#ef4444',
            border: `2px solid ${theme.colors.background}`,
          }} />
        </div>
        <span style={{ flex: 1, color: theme.colors.text, fontWeight: 600, fontSize: '15px' }}>
          {friendName}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={bodyStyle} ref={scrollRef}>
        {Array.isArray(messages) && messages.map((msg, idx) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id || idx}
              style={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...bubbleBase,
                  background: isMine ? theme.colors.primary : theme.colors.background,
                  color: isMine ? theme.colors.primaryText : theme.colors.text,
                  borderRadius: theme.radius.md || '8px',
                  // ✅ 말풍선 모양 디테일 (선택 사항)
                  borderBottomRightRadius: isMine ? '2px' : theme.radius.md,
                  borderBottomLeftRadius: !isMine ? '2px' : theme.radius.md,
                  border: isMine ? 'none' : `${theme.borderWidth.thin} solid ${theme.colors.border}`,
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={footerStyle}>
        <Input
          placeholder={i18n.chat.inputPlaceholder}
          style={{ flex: 1 }}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              handleSend();
            }
          }}
        />
        <Button 
          onClick={handleSend}
          disabled={!isConnected}
          style={{ fontSize: '13px', padding: '8px 14px', minHeight: 'auto' }}
        >
          {i18n.chat.send}
        </Button>
      </div>
    </Modal>
  );
}