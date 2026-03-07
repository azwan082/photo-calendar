import { createError, readBody, setResponseStatus } from 'h3'
import { AppSetting } from '../../database/entities'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface CreateSettingBody {
  key?: string
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
 * Creates a new application setting.
 */
export default defineEventHandler(async (event): Promise<SettingResponse> => {
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
  const repository = dataSource.getRepository(AppSetting)

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

  return {
    key: saved.key,
    value: saved.value,
    description: saved.description,
    updated_at: saved.updatedAt.toISOString()
  }
})
