/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Logout.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 10:48:58 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/09 22:51:36 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AuthContext } from '../contexts/AuthContext.types';

export const useLogout = () => {
  const navigate = useNavigate();
  const { setUser, isGuest, exitGuestMode } = useContext(AuthContext)!;

  const handleLogout = async () => {
    try {
      // 게스트도 백엔드 logout 호출 — refresh 쿠키 정리 + DB row 즉시 삭제(아니면 cron 까지 대기).
      await authService.logout();
      // 의도된 로그아웃은 세션만료 경고창과 구분하기 위해 플래그를 남긴다.
      sessionStorage.setItem('intent_logout', '1');
    } catch (error) {
      console.error("로그아웃 서버 통신 에러:", error);
    } finally {
      setUser(null);
      if (isGuest) exitGuestMode();
      navigate('/login');
	  console.log('로그아웃 성공');
    }
  };

  return { handleLogout };
};
