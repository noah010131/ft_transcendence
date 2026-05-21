import { createContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface UserType {
  userId: string;
  loginId: string;
  nickname: string;
  userPhoto: string;
  isGuest?: boolean;
}

export interface AuthContextType {
  user: UserType | null;
  setUser: Dispatch<SetStateAction<UserType | null>>;
  isLoading: boolean;
  isGuest: boolean;
  setIsGuest: Dispatch<SetStateAction<boolean>>;
  // 백엔드에 게스트 진입 요청 → 성공 시 user/isGuest 동시 갱신. 실패 시 false.
  enterGuestMode: () => Promise<boolean>;
  exitGuestMode: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
