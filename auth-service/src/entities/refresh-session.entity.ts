/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   refresh-session.entity.ts                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/11 22:22:06 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/11 22:41:59 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Refresh 토큰을 세션 단위로 저장하기 위한 새 엔티티
// 토큰의 설계도

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Auth } from './auth.entity'; // 유저의 로그인 세션 정보 연결

@Entity('refresh_sessions')
export class RefreshSession {
  @PrimaryGeneratedColumn('uuid')//
  id: string;

  @Column({ name: 'user_id' }) // 아이디
  @Index()
  userId: string;

  @ManyToOne(() => Auth, { onDelete: 'CASCADE' })// 유저 한개에 여러 세션 가능, ondelete로 새션 삭제 같이
  @JoinColumn({ name: 'user_id' })
  user: Auth;

  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
