import { createError, getQuery } from 'h3'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface PostMediaResponse {
  id: number
  media_url: string
  media_type: string
  width: number | null
  height: number | null
}

interface PostResponse {
  id: number
  external_post_id: string
  caption: string | null
  timestamp: string
  account_id: number
  media: PostMediaResponse[]
}

interface PostRecord {
  id: number
  externalPostId: string
  caption: string | null
  timestamp: Date
  accountId: number
  media?: Array<{
    id: number
    mediaUrl: string
    mediaType: string
    width: number | null
    height: number | null
  }>
}

interface PostsListResponse {
  page: number
  limit: number
  total: number
  posts: PostResponse[]
}

/**
 * Parses a datetime query parameter and validates its format.
 */
function parseDateQueryParam(value: unknown, name: string): Date | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, statusMessage: `${name} must be a valid datetime` })
  }

  return parsed
}

/**
 * Maps a `Post` entity to API response shape.
 */
function serializePost(post: PostRecord): PostResponse {
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

/**
 * Returns paginated posts for the authenticated user with optional timestamp filters.
 */
export default defineEventHandler(async (event): Promise<PostsListResponse> => {
  const { user } = await requireUserFromToken(event)
  const query = getQuery(event)

  const page = typeof query.page === 'string' ? Number(query.page) : 1
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 10

  if (!Number.isInteger(page) || page < 1) {
    throw createError({ statusCode: 400, statusMessage: 'page must be a positive integer' })
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, statusMessage: 'limit must be an integer between 1 and 100' })
  }

  const sort = query.sort === 'asc' ? 'ASC' : query.sort === 'desc' || query.sort === undefined ? 'DESC' : null
  if (!sort) {
    throw createError({ statusCode: 400, statusMessage: 'sort must be asc or desc' })
  }

  const fromTimestamp = parseDateQueryParam(query.from_timestamp, 'from_timestamp')
  const toTimestamp = parseDateQueryParam(query.to_timestamp, 'to_timestamp')

  if (fromTimestamp && toTimestamp && fromTimestamp > toTimestamp) {
    throw createError({ statusCode: 400, statusMessage: 'from_timestamp must be <= to_timestamp' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository<PostRecord>('Post')

  const queryBuilder = repository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.media', 'media')
    .where('post.userId = :userId', { userId: user.id })
    .orderBy('post.timestamp', sort)
    .skip((page - 1) * limit)
    .take(limit)

  if (fromTimestamp) {
    queryBuilder.andWhere('post.timestamp >= :fromTimestamp', { fromTimestamp })
  }

  if (toTimestamp) {
    queryBuilder.andWhere('post.timestamp <= :toTimestamp', { toTimestamp })
  }

  const [posts, total] = await queryBuilder.getManyAndCount()

  if (total === 0) {
    throw createError({ statusCode: 404, statusMessage: 'no posts found' })
  }

  return {
    page,
    limit,
    total,
    posts: posts.map(serializePost)
  }
})
