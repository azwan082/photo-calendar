import { EntitySchema } from 'typeorm'

export interface SyncLogInterface {
  id: number
  accountId: number
  startedAt: Date
  finishedAt: Date | null
  success: boolean
  message: string | null
  account?: any
}

export const SyncLogSchema = new EntitySchema<SyncLogInterface>({
  name: 'sync_log',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    accountId: {
      name: 'account_id',
      type: Number
    },
    startedAt: {
      name: 'started_at',
      type: Date
    },
    finishedAt: {
      name: 'finished_at',
      type: Date,
      nullable: true
    },
    success: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      nullable: true
    }
  },
  relations: {
    account: {
      target: 'social_account',
      type: 'many-to-one',
      inverseSide: 'syncLogs',
      joinColumn: {
        name: 'account_id'
      },
      onDelete: 'CASCADE'
    }
  }
})
