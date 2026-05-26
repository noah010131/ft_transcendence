/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chat.gateway.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/29 19:06:54 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/18 09:38:06 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketServer,
  
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { OnModuleInit, Inject } from '@nestjs/common';
import { PRESENCE_UPDATED_CHANNEL, PresenceUpdatedEvent } from 'src/types/presence.types';
import { SendDmDto, GetHistoryDto } from './dto/message.dto'; // DTO 임포트
import { Redis } from 'ioredis';

// suna : env에 콤마로 여러 origin을 넣을 수 있게 파싱. LAN IP 원격 접속 대응.
const chatCorsOrigin = (() => {
  const raw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
  const list = raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
  return list.length === 1 ? list[0] : list;
})();

@WebSocketGateway({ namespace: 'chat', cors: { origin: chatCorsOrigin, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;

  private activeUsersCount = 0;
  private isSubscribed = false;
  
  constructor(private readonly chatService: ChatService, @Inject('REDIS_SUB') private readonly redisSub: Redis,
  ) {}

  // 서버가 시작될 때 Redis 구독 설정
  onModuleInit() {
    this.setupPresenceSubscription();
  }
  
  private extractUserId(client: Socket): string | null {
    const userId = client.handshake.headers['x-user-id'];
    if (!userId) {
      const queryId = client.handshake.query.userId;
      return typeof queryId === 'string' ? queryId : null;
  }
    if (Array.isArray(userId) || userId.trim() === '') {
      return null;
    }
    return userId;
  }
  
  private setupPresenceSubscription() {
    this.redisSub.on('message', (channel, message) => {
      if (channel === PRESENCE_UPDATED_CHANNEL) {
        try {
          const event: PresenceUpdatedEvent = JSON.parse(message);
          
          if (!event || !event.userId) return;

          this.server.emit('user_presence_changed', {
            userId: event.userId,
            status: event.publicStatus, 
          });
          
          console.log(`Subscription [Presence Update] User ${event.userId} is now ${event.publicStatus}`);
        } catch (error) {
          console.error(`[Redis Sub Error] 메시지 파싱 실패: ${error.message}`);
        }
      }
    });
  }
  async handleConnection(client: Socket) {
    console.log('소캣 chat-gateway 도착');
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        console.error(`[Chat] 인증 헤더 누락: 접속 거부 (ID: ${client.id})`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      await this.chatService.saveSocketId(userId, client.id);
      
      this.activeUsersCount++;
      console.log(`[Chat] 유저 온라인: ${userId} (현재 접속자: ${this.activeUsersCount})`);
      
      if (this.activeUsersCount === 1 && !this.isSubscribed) {
        await this.redisSub.subscribe(PRESENCE_UPDATED_CHANNEL);
        this.isSubscribed = true;
        console.log('[Redis] 첫 채팅 유저 접속 - 구독 활성화');
      }
      
    } catch (error: any) {
      console.error(`[Chat] 연결 처리 중 예외 발생: ${error.message}`);
      client.disconnect();
    }
  }
  
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @SubscribeMessage('send_dm')
  async handleDM(client: Socket, payload: SendDmDto) { // DTO 적용
    const from = client.data.userId;
    const { to, message } = payload;

    if (!from) {
      console.error(`[DM Error] 인증되지 않은 송신자 접근`);
      client.emit('error', { message: '인증 정보가 없습니다.' });
      return;
    }

    try {
      console.log(`[DM Request] From: ${from} -> To: ${to}`);
      const chatLog = await this.chatService.processMessage(from, to, message);

      const targetSocketId = await this.chatService.getUserSocketId(to);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('new_dm', chatLog);
        console.log(`[Real-time Push] Sent to ${to}`);
      }

      client.emit('send_success', { messageId: chatLog.id });
    } catch (err: any) {
      console.error(`[DM Process Error] ${err.message}`);
      client.emit('error', { message: '메시지 전송 실패' });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      try {
        await this.chatService.removeSocketId(userId);
        
        this.activeUsersCount--;
        console.log(`[Disconnected] User: ${userId} (남은 접속자: ${this.activeUsersCount})`);

        if (this.activeUsersCount <= 0 && this.isSubscribed) {
          await this.redisSub.unsubscribe(PRESENCE_UPDATED_CHANNEL);
          this.isSubscribed = false;
          this.activeUsersCount = 0; // 음수 방지 가드
          console.log('[Redis] 접속 유저 없음 - 구독 해제');
        }
      } catch (err: any) {
        console.error(`[Redis Error] 오프라인 상태 변경 실패: ${err.message}`);
      }
    }
  }

//   @SubscribeMessage('mark_as_read')
//   async handleMarkAsRead(client: Socket, payload: { messageId: number }) {
//     const userId = client.data.userId; // 읽은 사람 ID

//     try {
//       // 1. 데이터 유효성 검사
//       if (!payload.messageId) {
//         throw new Error('메시지 ID가 누락되었습니다.');
//       }

//       console.log(`[Read Request] User: ${userId} -> Message: ${payload.messageId}`);

//       // 2. Service를 호출하여 DB 상태 변경 (isRead: false -> true)
//       // 이 함수는 chat.service.ts에 구현되어 있어야 합니다.
//       const updatedMessage = await this.chatService.updateReadStatus(payload.messageId, userId);

//       // 3. 성공 시 수신확인 응답 (본인에게)
//       client.emit('read_success', { messageId: payload.messageId });

//       // 4. (옵션) 보낸 사람에게도 '읽음' 상태를 실시간으로 알리고 싶다면?
//       const senderSocketId = await this.chatService.getUserSocketId(updatedMessage.senderId);
//       if (senderSocketId) {
//         this.server.to(senderSocketId).emit('message_read_by_opponent', {
//           messageId: payload.messageId,
//           readerId: userId
//         });
//       }

//     } catch (err: any) {
//       // 에러 발생 시 로그를 남기고 클라이언트에 에러 메시지 전송
//       console.error(`[Read Error] ${err.message}`);
//       client.emit('error', { 
//         code: 'READ_FAIL',
//         message: '읽음 처리 중 오류가 발생했습니다.' 
//       });
//     }
//   }
}