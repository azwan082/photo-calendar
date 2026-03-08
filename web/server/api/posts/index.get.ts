import { createError, getQuery } from 'h3'
import { PostSchema } from '../../database/entities'
import type { PostInterface } from '../../database/entities'
import type { PaginatedResponse, PostDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toPostDto } from '../../utils/serializers'

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
 * Returns paginated posts for the authenticated user with optional timestamp filters.
 */
export default defineEventHandler(async (event): Promise<PaginatedResponse<'posts', PostDto>> => {
  const { user } = await requireUserFromToken(event)
  const query = getQuery(event)

  const page = typeof query.page === 'string' ? Number(query.page) : 1
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 100

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
  const sortBy =
    query.sort_by === undefined
      ? 'id'
      : typeof query.sort_by === 'string'
        ? query.sort_by
        : null

  const sortableColumns = new Map<string, string>([
    ['id', 'post.id'],
    ['timestamp', 'post.timestamp'],
    ['external_post_id', 'post.externalPostId'],
    ['account_id', 'post.accountId']
  ])
  const sortColumn = sortBy ? sortableColumns.get(sortBy) : null
  if (!sortColumn) {
    throw createError({ statusCode: 400, statusMessage: 'sort_by is invalid' })
  }

  const fromTimestamp = parseDateQueryParam(query.from_timestamp, 'from_timestamp')
  const toTimestamp = parseDateQueryParam(query.to_timestamp, 'to_timestamp')

  if (fromTimestamp && toTimestamp && fromTimestamp > toTimestamp) {
    throw createError({ statusCode: 400, statusMessage: 'from_timestamp must be <= to_timestamp' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('post')

  const queryBuilder = repository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.media', 'media')
    .where('post.userId = :userId', { userId: user.id })
    .orderBy(sortColumn, sort)
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
    posts: posts.map(toPostDto)
  }
})
