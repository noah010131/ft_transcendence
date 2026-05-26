/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GamePage.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/11 21:25:37 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/18 20:23:37 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GameBoard from '../components/game/GameBoard';
import { useGameContext } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/useI18n';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GamePage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	// 게임 페이지에 들어오자마자 소켓 연결 및 데이터 수신 시작
	const { gameState, movePaddle, matchInfo, gameResult, isConnected, sendReady } = useGameContext();
	const { messages } = useI18n();
	const inputStateRef = useRef({ up: false, down: false });

	// 매칭 정보도 없고 게임 결과도 없는 상태로 주소창에 /game만 치고 들어온 유저를 홈으로 튕겨냅니다.
    useEffect(() => {
        if (!matchInfo && !gameResult) {
            console.warn('[GamePage] 활성화된 게임 세션이 없어 홈으로 리다이렉트합니다.');
            navigate('/home');
        }
    }, [matchInfo, gameResult, navigate]);
	
	useEffect(() => {
        // 소켓이 연결되어 있고, 아직 게임 결과가 안 나왔으며, 매칭 정보가 존재할 때 1회 송신
        if (isConnected && matchInfo && !gameResult) {
            console.log('[GamePage] 인게임 페이지 로드 완료 ➡️ sendReady 실행');
            sendReady(); 
        }
    }, [isConnected, matchInfo, gameResult, sendReady]);

	useEffect(() => {
		// daeunki2수정 : 수정이유
		// keydown 1회당 1번 전송 방식은 패들이 끊겨 보인다.
		// 키 상태를 유지(up/down)하고 짧은 주기로 연속 전송해 부드럽게 움직이게 한다.
		const handleKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (key === 'w') inputStateRef.current.up = true;
			if (key === 's') inputStateRef.current.down = true;
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (key === 'w') inputStateRef.current.up = false;
			if (key === 's') inputStateRef.current.down = false;
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		const interval = setInterval(() => {
			if (!isConnected) return;
			if (inputStateRef.current.up && !inputStateRef.current.down) {
				movePaddle('up');
			} else if (inputStateRef.current.down && !inputStateRef.current.up) {
				movePaddle('down');
			}
		}, 1000 / 60);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			clearInterval(interval);
			inputStateRef.current.up = false;
			inputStateRef.current.down = false;
		};
	}, [isConnected, movePaddle]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      color: '#fff',
      paddingTop: '40px'
    }}>
      <h1 style={{ marginBottom: '20px', letterSpacing: '4px' }}>PONG MATCH</h1>
      
      <div style={{ position: 'relative' }}> {/* 🚩 결과창의 기준점 */}
      {isConnected || gameResult ? (
        <GameBoard 
          data={gameState} 
          meName={user?.nickname || 'ME'} 
          matchInfo={matchInfo}
        />
      ) : (
        <p>{messages.game.connectGameServer}</p>
      )}

      {/* 🚩 결과가 나오면 보드 정중앙에 띄움 */}
      {gameResult && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', // 정중앙 정렬
          padding: '40px', borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.9)', // 보드가 비치게 약간 투명하게
          border: '3px solid gold', fontSize: '32px',
          fontWeight: 'bold', textAlign: 'center', minWidth: '300px'
        }}>
          {gameResult.winnerId === user?.userId ? messages.game.winner: messages.game.loser}
          <button onClick={() => window.location.href = '/home'} style={{ /* 버튼 스타일 */ }}>
            {messages.game.backHome}
          </button>
        </div>
      )}
    </div>

    {!gameResult && (
      <p style={{ marginTop: '20px', color: '#888' }}>
        {messages.game.movePaddle} (W / S)
      </p>
    )}
  </div>
);
}
