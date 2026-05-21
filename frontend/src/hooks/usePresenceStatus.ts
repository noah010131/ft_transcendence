/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePresenceStatus.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/09 09:23:58 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/09 10:37:42 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { presenceStore } from '../services/presenceStore';
import type { PresenceStatus } from '../types/presence';
import { useSyncExternalStore } from 'react';

export const usePresenceStatus = (userId: string | null): PresenceStatus =>
  useSyncExternalStore(
    presenceStore.subscribe, // 상태가 바뀌면 재랜더하게 함.
    () => (userId ? presenceStore.get(userId) : 'OFFLINE'), // 현재 유저 상태 읽기, 없으면 기본값은 offline
    () => 'OFFLINE', //서버 랜더링/초기 fallback값
  );

// 현재 연결이 끊기거나 로그아웃을 하면 오프라인을 하게 해 두었기 때문에 기본값은 오프라인으로 했습니다.
// 안그럼 로그인이 막힙니다.....!