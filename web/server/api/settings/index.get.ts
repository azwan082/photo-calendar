import { createError, getQuery } from 'h3'
import { AppSettingSchema } from '../../database/entities'
import type { AppSettingInterface } from '../../database/entities'
import type { PaginatedResponse, SettingDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toSettingDto } from '../../utils/serializers'

/**
 * Lists all application settings for authenticated users.
 */
export default defineEventHandler(async (event): Promise<PaginatedResponse<'settings', SettingDto>> => {
  await requireUserFromToken(event)
  const query = getQuery(event)

  const page = typeof query.page === 'string' ? Number(query.page) : 1
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 100

  if (!Number.isInteger(page) || page < 1) {
    throw createError({ statusCode: 400, statusMessage: 'page must be a positive integer' })
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, statusMessage: 'limit must be an integer between 1 and 100' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('app_setting')
  const [settings, total] = await repository.findAndCount({
    order: { key: 'ASC' },
    skip: (page - 1) * limit,
    take: limit
  })

  return {
    page,
    limit,
    total,
    settings: settings.map(toSettingDto)
  }
})
