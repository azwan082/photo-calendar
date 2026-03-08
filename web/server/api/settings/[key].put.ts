import { createError, getRouterParam, readBody } from 'h3'
import { AppSettingSchema } from '../../database/entities'
import type { AppSettingInterface } from '../../database/entities'
import type { KeyedResponse, SettingDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toSettingDto } from '../../utils/serializers'

interface UpdateSettingBody {
  value?: string
  description?: string | null
}

/**
 * Updates an existing application setting by key.
 */
export default defineEventHandler(async (event): Promise<KeyedResponse<'setting', SettingDto>> => {
  await requireUserFromToken(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const body = await readBody<UpdateSettingBody>(event)
  if (typeof body.value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'value is required' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('app_setting')
  const setting = await repository.findOne({ where: { key } })

  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  setting.value = body.value
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    setting.description = typeof body.description === 'string' ? body.description : null
  }

  const saved = await repository.save(setting)

  return { message: '', setting: toSettingDto(saved) }
})
