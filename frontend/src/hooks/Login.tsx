/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Login.tsx                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 10:49:02 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/24 19:18:22 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AuthContext } from '../contexts/AuthContext.types';
import { useI18n } from '../i18n/useI18n';
import { useAuthInit } from '../hooks/useAuthInit';

export const useLogin = () => {
  const navigate = useNavigate();
  const { messages } = useI18n(); //언어 추가
  const { setUser } = useContext(AuthContext)!; //  유저를 저장하기위한 전역 주머니
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // 초기화
  const { fetchMe } = useAuthInit();
  

const handleLogin = async () => {
		const trimmedId = id.trim();
		const trimmedPassword = password.trim();

		if (!trimmedId) {
			setErrorMsg(messages.errors.ID_REQUIRED);
			return;
		}
		if (!trimmedPassword) {
			setErrorMsg(messages.errors.PASSWORD_REQUIRED);
			return;
		}

		setIsLoading(true);
		setErrorMsg(null); // 메세지 초기화
		
		try {
				const result = await authService.login(trimmedId, password);
  
		if (result.success === true) {
		setUser(result.user);
	  	console.log('로그인 성공:', result.message);
	  	console.log('토큰:', result.accessToken);
	  
		await fetchMe();
	  	navigate('/home');
		}
		else { 
        // 기존 fallback('OK') 대신 서버 에러 코드 기반 번역을 우선해 실제 원인 표시를 유지합니다.
        // const translated = (messages.errors as any)[result.message] || messages.result.false;
		const translated = (messages.errors as any)[result.message] || messages.errors.SERVER_ERROR;
	        setErrorMsg(translated);
		}
  	} catch(error) {
	console.error('로그인 에러:', error);
	setErrorMsg(messages.errors.SERVER_ERROR);
	} finally {
		setIsLoading(false);
	}
};

// 컴포넌트에서 필요한 것들만 내보냅니다.
  return {
    id,
    setId,
    password,
    setPassword,
    handleLogin,
    isLoading,
	errorMsg,
    setErrorMsg
  };
};
