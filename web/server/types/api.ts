import type { TokenClaims } from '../utils/token'

export interface MessageResponse {
  message: string
}

export type DataResponse<T> = MessageResponse & {
  data: T
}

export type KeyedResponse<K extends string, T> = MessageResponse & {
  [P in K]: T
}

export type PaginatedResponse<K extends string, T> = {
  page: number
  limit: number
  total: number
} & {
  [P in K]: T[]
}

export interface UserDto {
  id: number
  email: string
  username: string
  auth_type: string
  is_superadmin: boolean
  is_sync_locked: boolean
  created_at: string
}

export interface PostMediaDto {
  id: number
  media_url: string
  media_type: string
  width: number | null
  height: number | null
}

export interface PostDto {
  id: number
  external_post_id: string
  caption: string | null
  timestamp: string
  account_id: number
  media: PostMediaDto[]
}

export interface SettingDto {
  key: string
  value: string
  description: string | null
  updated_at: string
}

export interface SessionDto {
  user: {
    id: string
    username: string
    email: string
    is_superadmin: boolean
  }
  expires_at: string
}

export interface UserInfoDto {
  sub: string
  name: string
  email: string
  roles: string[]
}

export interface ValidateResultDto {
  valid: true
  claims: TokenClaims
}
