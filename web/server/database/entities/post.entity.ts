import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Media } from './media.entity'
import { SocialAccount } from './social-account.entity'
import { User } from './user.entity'

@Entity({ name: 'post' })
@Index(['accountId', 'externalPostId'], { unique: true })
/**
 * Represents a synchronized social media post record.
 */
export class Post {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'account_id', type: 'int' })
  accountId!: number

  @Column({ name: 'external_post_id', type: 'varchar', length: 255 })
  externalPostId!: string

  @Column({ type: 'text', nullable: true })
  caption!: string | null

  @Column({ type: 'datetime' })
  timestamp!: Date

  @Column({ name: 'synced_at', type: 'datetime', nullable: true })
  syncedAt!: Date | null

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @ManyToOne(() => SocialAccount, (account) => account.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: SocialAccount

  @OneToMany(() => Media, (media) => media.post)
  media!: Media[]
}
