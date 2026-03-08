import { createError, readBody, setResponseStatus } from 'h3'
import { AppSettingSchema } from '../../database/entities'
import type { AppSettingInterface } from '../../database/entities'
import type { KeyedResponse, SettingDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toSettingDto } from '../../utils/serializers'

interface CreateSettingBody {
  key?: string
  value?: string
  description?: string | null
}

/**
 * Creates a new application setting.
 */
export default defineEventHandler(async (event): Promise<KeyedResponse<'setting', SettingDto>> => {
  await requireUserFromToken(event)

  const body = await readBody<CreateSettingBody>(event)
  const key = typeof body?.key === 'string' ? body.key.trim() : ''

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  if (typeof body.value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'value is required' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('app_setting')

  const existing = await repository.findOne({ where: { key } })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: `setting '${key}' already exists` })
  }

  const setting = repository.create({
    key,
    value: body.value,
    description: typeof body.description === 'string' ? body.description : null
  })

  const saved = await repository.save(setting)
  setResponseStatus(event, 201)

  return { message: '', setting: toSettingDto(saved) }
})
