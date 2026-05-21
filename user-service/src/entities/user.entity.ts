// src/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users') // DB에 'users'라는 테이블이 생깁니다.
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  // 게스트는 loginId 가 NULL. PG 의 unique+nullable 은 NULL 다중 허용.
  @Column({ name: 'loginId', unique: true, nullable: true, type: 'varchar' })
  loginId: string | null;

  @Column({ unique: true })
  nickname: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  userPhoto: string;

  @Column()
  role: string;
}
