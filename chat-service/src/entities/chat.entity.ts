/* ************************************************************************** */
/* */
/* :::      ::::::::   */
/* chat.entity.ts                                     :+:      :+:    :+:   */
/* +:+ +:+         +:+     */
/* By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/* +#+#+#+#+#+   +#+           */
/* Created: 2026/04/29 19:10:00 by chanypar          #+#    #+#             */
/* Updated: 2026/04/29 19:12:00 by chanypar         ###   ########.fr       */
/* */
/* ************************************************************************** */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @Column('text')
  content: string;

  // @Column({ default: false })
  // isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}