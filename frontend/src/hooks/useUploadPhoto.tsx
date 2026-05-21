/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useUploadPhoto.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/30 13:14:42 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/30 13:14:43 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateProfile } from './UpdateProfile';
import { userService } from '../services/userService';
import { useI18n } from '../i18n/useI18n';

export function useUploadPhoto() {
  const { user } = useAuth();
  const { updateProfile, isUpdating: isProfileUpdating } = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const { messages } = useI18n(); //언어 추가
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadPhoto = async (file: File) => {
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB를 Byte 단위로 계산
    if (file.size > maxSize) {
      setErrorMsg(messages.errors.TOO_BIG_FILE);
      return; // 서버로 보내지 않고 여기서 중단
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const response = await userService.uploadPhoto(formData);

      if (response?.success && response.url) {
        await updateProfile({ userPhoto: response.url });
		    return response.url;
      } else {
        setErrorMsg(messages.errors.IMAGE_FORMAT_NOT_ALLOWED);
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      const serverError = error.response?.data?.message || messages.errors?.SERVER_ERROR;
      setErrorMsg(serverError);
    } finally {
      setIsUploading(false);
    }
  };

  return { 
    uploadPhoto, 
    isProcessing: isUploading || isProfileUpdating,
    errorMsg, 
    setErrorMsg
  };
}