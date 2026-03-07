import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Post } from './post.entity'
import { SocialAccount } from './social-account.entity'

export enum AuthType {
  SSO = 'sso',
  LOCAL = 'local'
}

@Entity({ name: 'user' })
/**
 * Represents an application user account and profile metadata.
 */
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName!: string

  @Column({
    name: 'auth_type',
    type: 'simple-enum',
    enum: AuthType
  })
  authType!: AuthType

  @Column({ type: 'varchar', length: 120, unique: true })
  username!: string

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash!: string | null

  @Column({ name: 'is_superadmin', type: 'boolean', default: false })
  isSuperadmin!: boolean

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date

  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user)
  socialAccounts!: SocialAccount[]

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[]
}
