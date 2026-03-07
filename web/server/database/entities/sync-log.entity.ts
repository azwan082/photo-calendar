import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { SocialAccount } from './social-account.entity'

@Entity({ name: 'sync_log' })
/**
 * Represents one synchronization execution log entry for an account.
 */
export class SyncLog {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'account_id', type: 'int' })
  accountId!: number

  @Column({ name: 'started_at', type: 'datetime' })
  startedAt!: Date

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt!: Date | null

  @Column({ type: 'boolean', default: false })
  success!: boolean

  @Column({ type: 'text', nullable: true })
  message!: string | null

  @ManyToOne(() => SocialAccount, (account) => account.syncLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: SocialAccount
}
