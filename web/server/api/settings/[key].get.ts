import { createError, getRouterParam } from 'h3'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface SettingResponse {
  key: string
  value: string
  description: string | null
  updated_at: string
}

interface AppSettingRecord {
  key: string
  value: string
  description: string | null
  updatedAt: Date
}

/**
 * Retrieves one application setting by key.
 */
export default defineEventHandler(async (event): Promise<SettingResponse> => {
  await requireUserFromToken(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const dataSource = await getDataSource()
  const setting = await dataSource.getRepository<AppSettingRecord>('AppSetting').findOne({
    where: { key }
  })

  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  return {
    key: setting.key,
    value: setting.value,
    description: setting.description,
    updated_at: setting.updatedAt.toISOString()
  }
})
