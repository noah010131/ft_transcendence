import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'game_records' })
export class GameRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('uq_game_records_game_id', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  gameId: string | null;

  @Column({ type: 'varchar', length: 64 })
  player1Id: string;

  @Column({ type: 'varchar', length: 64 })
  player2Id: string;

  @Column({ type: 'varchar', length: 64 })
  winnerId: string;

  @Column({ type: 'varchar', length: 64 })
  loserId: string;

  @Column({ type: 'varchar', length: 64 })
  winnerNickname: string;

  @Column({ type: 'varchar', length: 64 })
  loserNickname: string;

  @Column({ type: 'int' })
  player1Score: number;

  @Column({ type: 'int' })
  player2Score: number;

  @Column({ type: 'varchar', length: 16 })
  endedReason: 'normal' | 'forfeit';

  @CreateDateColumn({ type: 'timestamptz' })
  playedAt: Date;
}
