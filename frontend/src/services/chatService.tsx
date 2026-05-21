/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chatService.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/30 13:18:00 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/07 11:42:46 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import apiClient from './apiClient';

export interface ChatMessage {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
//   isRead: boolean;
  createdAt: string;
}

export const chatService = {
	
  getHistory: async (targetId: string) => {
    // 백엔드 컨트롤러 경로: /chat/debug/history/:user1/:user2 
    // (또는 실제 API 경로에 맞춰 수정)
    return await apiClient('get', `api/chat/history/${targetId}`, {});
  },

  // 상대방 상태 조회 추가
  getUserStatus: async (targetId: string): Promise<{ status: 'ONLINE' | 'OFFLINE' | 'IN_GAME' }> => {
    // 백엔드에 새로 만들 /api/chat/status/:userId 경로를 호출합니다.
    return await apiClient('get', `api/chat/status/${targetId}`, {});
  },


//   // 메시지 읽음 상태 업데이트 (HTTP PATCH)
//   markAsRead: async (messageId: number) => {
//     return await apiClient('patch', `api/chat/messages/${messageId}/read`, {});
//   }
};