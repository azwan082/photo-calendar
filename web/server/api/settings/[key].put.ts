import { createError, getRouterParam, readBody } from 'h3'
import { AppSetting } from '../../database/entities'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface UpdateSettingBody {
  value?: string
  description?: string | null
}

interface SettingResponse {
  key: string
  value: string
  description: string | null
  updated_at: string
}

/**
 * Updates an existing application setting by key.
 */
export default defineEventHandler(async (event): Promise<SettingResponse> => {
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
  const repository = dataSource.getRepository(AppSetting)
  const setting = await repository.findOne({ where: { key } })

  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  setting.value = body.value
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    setting.description = typeof body.description === 'string' ? body.description : null
  }

  const saved = await repository.save(setting)

  return {
    key: saved.key,
    value: saved.value,
    description: saved.description,
    updated_at: saved.updatedAt.toISOString()
  }
})
