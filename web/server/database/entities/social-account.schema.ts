import { EntitySchema } from 'typeorm'

export interface SocialAccountInterface {
  id: number
  userId: number
  provider: string
  accountId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  user?: any
  posts?: any[]
  syncLogs?: any[]
}

export const SocialAccountSchema = new EntitySchema<SocialAccountInterface>({
  name: 'social_account',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    userId: {
      name: 'user_id',
      type: Number
    },
    provider: {
      type: String,
      length: 80
    },
    accountId: {
      name: 'account_id',
      type: String,
      length: 255
    },
    accessToken: {
      name: 'access_token',
      type: String
    },
    refreshToken: {
      name: 'refresh_token',
      type: String,
      nullable: true
    },
    expiresAt: {
      name: 'expires_at',
      type: Date,
      nullable: true
    }
  },
  indices: [
    {
      name: 'uq_social_provider_account',
      columns: ['provider', 'accountId'],
      unique: true
    }
  ],
  relations: {
    user: {
      target: 'user',
      type: 'many-to-one',
      inverseSide: 'socialAccounts',
      joinColumn: {
        name: 'user_id'
      },
      onDelete: 'CASCADE'
    },
    posts: {
      target: 'post',
      type: 'one-to-many',
      inverseSide: 'account'
    },
    syncLogs: {
      target: 'sync_log',
      type: 'one-to-many',
      inverseSide: 'account'
    }
  }
})
