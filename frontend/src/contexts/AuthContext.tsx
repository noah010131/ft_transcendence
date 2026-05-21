import { useState, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext.types';
import type { UserType } from './AuthContext.types';
import { authService } from '../services/authService';


export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
};

// 주머니를 제공하는 Provider 컴포넌트
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading] = useState(true);
  // 새로고침 직후엔 false 로 시작. useAuthInit.fetchMe 가 /me 응답의 isGuest 클레임으로 복원.
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // 백엔드에 게스트 진입 요청. 성공하면 access/refresh 쿠키가 설정되고
  // 응답으로 받은 닉네임으로 user/isGuest 를 동시에 채운다.
  const enterGuestMode = useCallback(async (): Promise<boolean> => {
    const result = await authService.guest();
    if (!result?.success) {
      console.error('[enterGuestMode] 게스트 진입 실패:', result?.message);
      return false;
    }
    setUser({
      userId: result.user.userId,
      id: result.user.id,
      nickname: result.user.id,
      userPhoto: '',
      isGuest: true,
    });
    setIsGuest(true);
    return true;
  }, []);

  const exitGuestMode = useCallback(() => {
    setUser(null);
    setIsGuest(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, isLoading, isGuest, setIsGuest, enterGuestMode, exitGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
};
