import { EntitySchema } from 'typeorm'

export interface PostInterface {
  id: number
  userId: number
  accountId: number
  externalPostId: string
  caption: string | null
  timestamp: Date
  syncedAt: Date | null
  user?: any
  account?: any
  media?: any[]
}

export const PostSchema = new EntitySchema<PostInterface>({
  name: 'post',
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
    accountId: {
      name: 'account_id',
      type: Number
    },
    externalPostId: {
      name: 'external_post_id',
      type: String,
      length: 255
    },
    caption: {
      type: String,
      nullable: true
    },
    timestamp: {
      type: Date
    },
    syncedAt: {
      name: 'synced_at',
      type: Date,
      nullable: true
    }
  },
  indices: [
    {
      name: 'uq_post_account_external',
      columns: ['accountId', 'externalPostId'],
      unique: true
    }
  ],
  relations: {
    user: {
      target: 'user',
      type: 'many-to-one',
      inverseSide: 'posts',
      joinColumn: {
        name: 'user_id'
      },
      onDelete: 'CASCADE'
    },
    account: {
      target: 'social_account',
      type: 'many-to-one',
      inverseSide: 'posts',
      joinColumn: {
        name: 'account_id'
      },
      onDelete: 'CASCADE'
    },
    media: {
      target: 'media',
      type: 'one-to-many',
      inverseSide: 'post'
    }
  }
})
