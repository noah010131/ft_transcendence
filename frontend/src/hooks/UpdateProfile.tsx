/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UpdateProfile.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/12 12:04:37 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/15 14:13:05 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext.types';
import { userService } from '../services/userService';
import { useI18n } from '../i18n/useI18n';

// 변경할 수 있는 필드들을 정의 (Partial을 써서 선택적으로 받음)
interface UpdateFields {
  userPhoto?: string;
  nickname?: string;
}

export const useUpdateProfile = () => {
  const context = useContext(AuthContext);
  const [isUpdating, setIsUpdating] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const { messages } = useI18n();

  if (!context) throw new Error('AuthProvider를 확인해주세요.');
  const { setUser } = context;

  const updateProfile = async (fields: UpdateFields) => {
    setIsUpdating(true);
    try {
      // 1. 서버에 수정된 필드들만 전송
      const response = await userService.updateProfile(fields);

      if (response?.success) {
        // 2. 서버 성공 시 Context 상태 업데이트
        // 기존 유저 데이터(prev) 위에 새로운 필드(fields)를 덮어씌움
        setUser((prev) => (prev ? { ...prev, ...fields } : null));
        return true;
      }
      else {
        const translated = (messages.errors as any)[response.message] || messages.errors.SERVER_ERROR;
        
        setAlertMsg(translated);
        console.log("프로필 수정 실패 사유:", response.message);
      }
    } catch (error) {
      console.error("프로필 수정 에러:", error);
      
      setAlertMsg(messages.errors?.SERVER_ERROR);
    } finally {
      setIsUpdating(false);
    }
    return false;
  };

  return { 
    updateProfile, 
    isUpdating, 
    alertMsg, 
    setAlertMsg 
  };
};