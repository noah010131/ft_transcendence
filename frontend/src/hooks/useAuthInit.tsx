/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useAuthInit.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/30 13:14:46 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/30 13:14:47 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useCallback, useContext} from 'react';
import { AuthContext } from '../contexts/AuthContext.types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuthInit = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthInit must be used within an AuthProvider');
  }

  const { setUser, setIsGuest } = context;

  // 인증 검증과 프로필 조회를 분리한다.
  // - 인증 검증: auth-service 의 /me 한 번만. JWT 만 검증하므로 user-service 다운에 영향 없음.
  // - 프로필 조회: user-service 의 /me. 실패해도 인증 상태는 끊지 않고 최소 정보로 user 를 채운다.
  // → user-service 다운 시 /home 같은 라우트는 정상 진입, /myspace·/social 은 ServiceGuard 가 처리.
  const fetchMe = useCallback(async (): Promise<boolean> => {
    const authResult = await authService.me().catch(() => null);
    if (!authResult?.success) {
      // 진짜 미인증: 토큰 없음/무효 + apiClient 의 자동 refresh 도 실패한 상태.
      setIsGuest(false);
      return false;
    }

    // JWT payload 의 isGuest 클레임이 진실의 원천. user-service 가 죽어도 이 값은 살아있다.
    const isGuest = authResult.user.isGuest === true;
    setIsGuest(isGuest);

    const profileResult = await userService.getMe().catch(() => null);
    if (profileResult?.success) {
      setUser({ ...profileResult.user, isGuest });
      return true;
    }

    // 프로필을 못 가져온 경우(주로 user-service 다운). 인증은 살아있으니
    // 최소 정보로 user 를 채워서 user-service 비의존 라우트는 사용 가능하게 한다.
    setUser((prev) => prev ?? {
      userId: authResult.user.userId,
      id: authResult.user.id,
      nickname: isGuest ? authResult.user.id : '',
      userPhoto: '',
      isGuest,
    });
    return true;
  }, [setUser, setIsGuest]);

  return { fetchMe };
}
