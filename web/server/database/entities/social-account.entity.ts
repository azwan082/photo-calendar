import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Post } from './post.entity'
import { SyncLog } from './sync-log.entity'
import { User } from './user.entity'

@Entity({ name: 'social_account' })
@Index(['provider', 'accountId'], { unique: true })
/**
 * Represents a linked social media account used for synchronization.
 */
export class SocialAccount {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ type: 'varchar', length: 80 })
  provider!: string

  @Column({ name: 'account_id', type: 'varchar', length: 255 })
  accountId!: string

  @Column({ name: 'access_token', type: 'text' })
  accessToken!: string

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken!: string | null

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null

  @ManyToOne(() => User, (user) => user.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @OneToMany(() => Post, (post) => post.account)
  posts!: Post[]

  @OneToMany(() => SyncLog, (syncLog) => syncLog.account)
  syncLogs!: SyncLog[]
}
