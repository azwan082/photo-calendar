import { createError, getRouterParam } from 'h3'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface DeleteSettingResponse {
  message: string
}

interface AppSettingRecord {
  key: string
}

/**
 * Deletes an application setting identified by key.
 */
export default defineEventHandler(async (event): Promise<DeleteSettingResponse> => {
  await requireUserFromToken(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository<AppSettingRecord>('AppSetting')

  const setting = await repository.findOne({ where: { key } })
  if (!setting) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  await repository.delete({ key })

  return {
    message: `Setting '${key}' deleted successfully.`
  }
})
