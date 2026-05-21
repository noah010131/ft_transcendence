// src/entities/friend.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type FriendStatus = 'pending' | 'accepted';

@Entity('friends')
@Unique(['requesterId', 'addresseeId'])
@Check(`"requesterId" <> "addresseeId"`)
export class Friend {
  @PrimaryGeneratedColumn()
  id: number;

  // 요청 보낸 사람
  @Column()
  @Index()
  requesterId: string;

  // 요청 받은 사람
  @Column()
  @Index()
  addresseeId: string;

  // pending: 요청 대기중, accepted: 친구 수락됨
  // (rejected는 row 삭제로 처리하므로 enum에 없음)
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: FriendStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addresseeId' })
  addressee: User;
}
