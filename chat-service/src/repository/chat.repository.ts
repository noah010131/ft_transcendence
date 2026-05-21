/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chat.repository.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/29 18:50:46 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/30 12:58:05 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */



import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/chat.entity';

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
  ) {}

  /**
   * 메시지를 DB에 영구 저장합니다. (오프라인 수송 보장의 핵심)
   */
  async saveMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
    try {
      const newMessage = this.repo.create(data);
      const savedMessage = await this.repo.save(newMessage);
      
      console.log(`[Repository] DB 저장 성공: ID ${savedMessage.id} (From: ${savedMessage.senderId} -> To: ${savedMessage.receiverId})`);
      return savedMessage;
    } catch (error) {
      console.error(`[Repository Error] DB 저장 중 에러 발생: ${error.message}`);
      throw error; // 서비스 계층으로 에러를 던져 Gateway에서 처리하게 함
    }
  }

  /**
   * 특정 유저에게 온 안 읽은 메시지들을 모두 가져옵니다.
   */
  async findUnreadMessages(userId: string): Promise<ChatMessage[]> {
    try {
      const messages = await this.repo.find({
        where: { receiverId: userId},
        // where: { receiverId: userId, isRead: false },
        order: { createdAt: 'ASC' }, // 오래된 메시지부터 순서대로
      });
      
      console.log(`[Repository] 유저 ${userId}의 미확인 메시지 ${messages.length}건 조회 완료`);
      return messages;
    } catch (error) {
      console.error(`[Repository Error] 메시지 조회 실패: ${error.message}`);
      return [];
    }
  }

  /**
   * 특정 유저의 메시지들을 '읽음' 상태로 업데이트합니다.
   */
  // async markAsRead(receiverId: string, senderId: string): Promise<void> {
  //   try {
  //     await this.repo.update(
  //       { receiverId, senderId, isRead: false },
  //       { isRead: true }
  //     );
  //     console.log(`[Repository] ${senderId}가 보낸 메시지를 ${receiverId}가 읽음 처리함`);
  //   } catch (error) {
  //     console.error(`[Repository Error] 읽음 처리 실패: ${error.message}`);
  //   }
  // }

  /**
 * 두 유저 간의 1:1 대화 내역 조회
 */
  async findDmHistory(userA: string, userB: string): Promise<ChatMessage[]> {
    try {
      const history = await this.repo.find({
        where: [
          { senderId: userA, receiverId: userB }, // A가 B에게 보낸 것
          { senderId: userB, receiverId: userA }, // B가 A에게 보낸 것
        ],
        order: { createdAt: 'ASC' }, // 과거부터 최신순으로 정렬
      });
  
      console.log(`[Repository] ${userA}-${userB} 대화 내역 ${history.length}건 조회 성공`);
      return history;
    } catch (error) {
      console.error(`[Repository Error] findDmHistory 실패: ${error.message}`);
      throw error;
    }
  }
}