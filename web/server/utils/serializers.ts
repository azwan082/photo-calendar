import type { AppSettingInterface, PostInterface, UserInterface } from '../database/entities'
import type { PostDto, SettingDto, UserDto } from '../types/api'

export function toUserDto(user: UserInterface): UserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    auth_type: user.authType,
    is_superadmin: user.isSuperadmin,
    is_sync_locked: user.isSyncLocked,
    created_at: user.createdAt.toISOString()
  }
}

export function toPostDto(post: PostInterface): PostDto {
  return {
    id: post.id,
    external_post_id: post.externalPostId,
    caption: post.caption,
    timestamp: post.timestamp.toISOString(),
    account_id: post.accountId,
    media: (post.media ?? []).map((media) => ({
      id: media.id,
      media_url: media.mediaUrl,
      media_type: media.mediaType,
      width: media.width,
      height: media.height
    }))
  }
}

export function toSettingDto(setting: AppSettingInterface): SettingDto {
  return {
    key: setting.key,
    value: setting.value,
    description: setting.description,
    updated_at: setting.updatedAt.toISOString()
  }
}
