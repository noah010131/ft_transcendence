/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameHistoryCard.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 20:48:02 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/18 20:48:10 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */



import React, { useMemo } from 'react'; // 🟢 useMemo 추가
import Card from '../ui/Card';
import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';
import { useGameHistory } from '../../hooks/useGameHistory';
import type { UserType } from '../../contexts/AuthContext.types';

interface GameHistoryCardProps {
  user: UserType;
}

export default function GameHistoryCard({ user }: GameHistoryCardProps) {
  const { theme } = useTheme();
  const { messages } = useI18n();

  const stableUserId = useMemo(() => user?.userId || null, [user?.userId]);
  const { history, isLoading } = useGameHistory(stableUserId);
  const displayedHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.slice(0, 5);
  }, [history]);

  const meText = messages.mySpace.me;

  return (
    <Card>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: theme.colors.text }}>
        {messages.mySpace.gameHistory}
      </h2>
      
      {isLoading ? (
        <p style={{ textAlign: 'center', color: theme.colors.textMuted }}>{messages.mySpace.Loading}</p>
      ) : displayedHistory.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedHistory.map((game, index) => { // 🟢 렌더링부 간결화
            const isWinnerMe = game.winnerNickname === user.nickname;
            const isLoserMe = game.loserNickname === user.nickname;

            const gameKey =
              game.id ??
              `${game.winnerNickname}-${game.loserNickname}-${game.winnerScore}-${game.loserScore}-${index}`;

            return (
              <div key={gameKey} style={{
                padding: '14px 20px',
                borderRadius: '8px',
                backgroundColor: theme.colors.backgroundVariant,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${theme.colors.border}`
              }}>
                {/* 승자 영역 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    backgroundColor: 'rgba(74, 222, 128, 0.2)', 
                    color: '#4ade80', 
                    fontWeight: 'bold' 
                  }}>
                    {messages.mySpace.win}
                  </span>
                  <span style={{ 
                    fontWeight: isWinnerMe ? 'bold' : 'normal',
                    color: theme.colors.text 
                  }}>
                    {game.winnerNickname} {isWinnerMe && `(${meText})`}
                  </span>
                </div>

                {/* 스코어 영역 */}
                <div style={{ 
                  flex: '0 0 100px', 
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  color: theme.colors.text
                }}>
                  {game.winnerScore} : {game.loserScore}
                </div>

                {/* 패자 영역 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', textAlign: 'right' }}>
                  <span style={{ 
                    fontWeight: isLoserMe ? 'bold' : 'normal',
                    color: isLoserMe ? theme.colors.text : theme.colors.textMuted 
                  }}>
                    {isLoserMe && `(${meText}) `}{game.loserNickname}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    backgroundColor: 'rgba(248, 113, 113, 0.2)', 
                    color: '#f87171', 
                    fontWeight: 'bold' 
                  }}>
                    {messages.mySpace.lose}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: 0, color: theme.colors.textMuted, textAlign: 'center' }}>
          {messages.mySpace.noGames}
        </p>
      )}
    </Card>
  );
}