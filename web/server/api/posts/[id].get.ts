import { createError, getRouterParam } from 'h3'
import { Post } from '../../database/entities'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface PostByIdResponse {
  id: number
  external_post_id: string
  caption: string | null
  timestamp: string
  account_id: number
  media: Array<{
    id: number
    media_url: string
    media_type: string
    width: number | null
    height: number | null
  }>
}

/**
 * Returns a single post by id for the authenticated user.
 */
export default defineEventHandler(async (event): Promise<PostByIdResponse> => {
  const { user } = await requireUserFromToken(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const dataSource = await getDataSource()
  const post = await dataSource.getRepository(Post).findOne({
    where: { id, userId: user.id },
    relations: { media: true }
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'no posts found' })
  }

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
})
