/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useGameHistory.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 20:47:50 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/18 20:47:51 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import { useState, useEffect, useCallback } from 'react';
import { gameService } from '../services/gameService';
import { useI18n } from '../i18n/useI18n';
import type { GameRecord } from '../types/game';

export const useGameHistory = (userId: string | null) => {
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { messages } = useI18n();

  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setErrorKey(null);

    try {
      console.log('[fetch history]');
      const data = await gameService.fetchHistory(userId);

      if (Array.isArray(data)) {
        setHistory(data);
      } else if (data && typeof data === 'object') {
        setHistory(Object.values(data));
      } else {
        setHistory([]);
      }
    } catch (error: any) {
      console.error("전적 로딩 에러:", error);
      const backendError = error?.response?.data?.message || 'SERVER_ERROR';
      setErrorKey(backendError);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const alertMsg = errorKey
    ? (messages.errors as any)[errorKey] || messages.errors?.SERVER_ERROR || "Server Error"
    : null;

  return { 
    history, 
    isLoading, 
    alertMsg, 
    setAlertMsg: (msg: string | null) => {
      if (!msg) setErrorKey(null);
    },
    refetch: fetchHistory
  };
};