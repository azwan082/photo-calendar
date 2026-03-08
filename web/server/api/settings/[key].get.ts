import { createError, getRouterParam } from 'h3'
import { AppSettingSchema } from '../../database/entities'
import type { AppSettingInterface } from '../../database/entities'
import type { KeyedResponse, SettingDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toSettingDto } from '../../utils/serializers'

/**
 * Retrieves one application setting by key.
 */
export default defineEventHandler(async (event): Promise<KeyedResponse<'setting', SettingDto>> => {
  await requireUserFromToken(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('app_setting')

  const setting = await repository.findOne({
    where: { key }
  })

  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  return { message: '', setting: toSettingDto(setting) }
})
