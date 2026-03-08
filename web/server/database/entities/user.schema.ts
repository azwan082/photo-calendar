import { EntitySchema } from 'typeorm'

export enum AuthType {
  SSO = 'sso',
  LOCAL = 'local'
}

export interface UserInterface {
  id: number
  email: string
  authType: AuthType
  username: string
  passwordHash: string | null
  isSuperadmin: boolean
  isSyncLocked: boolean
  createdAt: Date
  socialAccounts?: any[]
  posts?: any[]
}

export const UserSchema = new EntitySchema<UserInterface>({
  name: 'user',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    email: {
      type: String,
      length: 255,
      unique: true
    },
    authType: {
      name: 'auth_type',
      type: 'simple-enum',
      enum: AuthType
    },
    username: {
      type: String,
      length: 120,
      unique: true
    },
    passwordHash: {
      name: 'password_hash',
      type: String,
      nullable: true
    },
    isSuperadmin: {
      name: 'is_superadmin',
      type: Boolean,
      default: false
    },
    isSyncLocked: {
      name: 'is_sync_locked',
      type: Boolean,
      default: false
    },
    createdAt: {
      name: 'created_at',
      type: Date,
      createDate: true
    }
  },
  relations: {
    socialAccounts: {
      target: 'social_account',
      type: 'one-to-many',
      inverseSide: 'user'
    },
    posts: {
      target: 'post',
      type: 'one-to-many',
      inverseSide: 'user'
    }
  }
})
