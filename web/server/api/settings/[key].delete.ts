import { createError, getRouterParam } from 'h3'
import { AppSettingSchema } from '../../database/entities'
import type { AppSettingInterface } from '../../database/entities'
import type { MessageResponse } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

/**
 * Deletes an application setting identified by key.
 */
export default defineEventHandler(async (event): Promise<MessageResponse> => {
  await requireUserFromToken(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('app_setting')

  const setting = await repository.findOne({ where: { key } })
  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  await repository.delete({ key })

  return {
    message: `Setting '${key}' deleted successfully.`
  }
})
