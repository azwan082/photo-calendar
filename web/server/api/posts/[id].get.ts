import { createError, getRouterParam } from 'h3'
import { PostSchema } from '../../database/entities'
import type { PostInterface } from '../../database/entities'
import type { KeyedResponse, PostDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toPostDto } from '../../utils/serializers'

/**
 * Returns a single post by id for the authenticated user.
 */
export default defineEventHandler(async (event): Promise<KeyedResponse<'post', PostDto>> => {
  const { user } = await requireUserFromToken(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const dataSource = await getDataSource()
  const post = await dataSource.getRepository('post').findOne({
    where: { id, userId: user.id },
    relations: { media: true }
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'no posts found' })
  }

  return { message: '', post: toPostDto(post) }
})
