/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   authService.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 10:49:14 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/15 14:42:00 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import apiClient from './apiClient';

export const authService = {
  // 로그인 기능: 'post' 방식과 '/login' 주소를 지정해서 공통 함수 호출
  login: async (id: string, password: string) => {
    return await apiClient('post', 'api/auth/login', { id, password});
  },

  // 회원가입 기능
  signup: async (userData: any) => {
    return await apiClient('post', 'api/auth/signup', userData);
  },

  // 로그아웃 기능
  logout: async () => {
    return await apiClient('post', 'api/auth/logout', {});
  },

  // 게스트 진입 — 백엔드가 임시 Auth/User row + access/refresh 쿠키를 굽는다.
  // 응답: { success, user: { userId: <UUID>, id: <Guest_xxx 닉네임>, isGuest: true } } 또는 { success: false, message }
  guest: async () => {
    return await apiClient('post', 'api/auth/guest', {});
  },

  // 게이트웨이가 at만료일때 리프레시
  refresh: async () => {
    return await apiClient('post', 'api/auth/refresh', {});
  },

  // 인증 검증 전용: JWT 만 검증, user-service 의존 없음.
  // user-service 가 다운돼도 이 호출은 살아있다.
  me: async () => {
    return await apiClient('get', 'api/auth/me');
  },
};
