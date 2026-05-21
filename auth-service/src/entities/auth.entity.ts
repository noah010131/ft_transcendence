
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('auth') // DB에 'users'라는 테이블이 생깁니다.
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 게스트 row 는 loginId/password 가 NULL. PG 의 unique+nullable 은 NULL 다중 허용.
  @Column({ unique: true, nullable: true, type: 'varchar' })
  loginId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  password: string | null;

  // 'member' | 'guest'. 매칭/가드 분기에 사용.
  @Column({ type: 'varchar', default: 'member' })
  role: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
