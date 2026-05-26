/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Register.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 10:49:06 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/20 16:53:41 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useI18n } from '../i18n/useI18n';

export const useRegister = () => {
  const navigate = useNavigate();
  const { messages } = useI18n();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [nick, setNick] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

const [alertMsg, setAlertMsg] = useState<string | null>(null);
  
const handleRegister = async () => {
    const trimmedId = id.trim();
    const trimmedNick = nick.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedId) {
      setAlertMsg(messages.errors.ID_REQUIRED);
      return;
    }
    if (!trimmedNick) {
      setAlertMsg(messages.errors.NICKNAME_REQUIRED);
      return;
    }
    if (!trimmedPassword) {
      setAlertMsg(messages.errors.PASSWORD_REQUIRED);
      return;
    }
    if (!trimmedConfirmPassword) {
      setAlertMsg(messages.errors.CONFIRM_PASSWORD_REQUIRED);
      return;
    }

    if (password !== confirmPassword) {
      //alert("비밀번호가 일치하지 않습니다.");
    setAlertMsg(messages.errors?.INVALID_PASSWORD);
      return;
    }
    setIsLoading(true);
    try {
    	const result = await authService.signup({ id: trimmedId, password, nick: trimmedNick });

	      if (result.success) {
        //alert("회원가입 성공! 로그인해 주세요.");
        setAlertMsg(messages.result?.success || "Success!");
        //지금은 이메일 중복만 경고하고 있음 나중에 닉네임 중복도 추가해야 할지도?
        navigate('/login');
	      	} else {
            // Login 훅과 동일하게 i18n 메시지로 매핑
            // setAlertMsg(result.message);
            const translated = (messages.errors as any)[result.message] || messages.errors.SERVER_ERROR;
	          setAlertMsg(translated);
	          console.log("회원가입 실패 사유:", result);
	      	}
    } catch (error) {
      console.error("회원가입 에러:", error);
      setAlertMsg(messages.errors?.SERVER_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    id,
    setId,
    password,
    setPassword,
    nick,
    setNick,
    confirmPassword,
    setConfirmPassword,
	  isLoading,
    handleRegister,
    alertMsg,
    setAlertMsg
  };
};
