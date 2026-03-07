import { AppSetting } from '../../database/entities'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

interface SettingsListResponse {
  settings: Array<{
    key: string
    value: string
    description: string | null
    updated_at: string
  }>
}

/**
 * Lists all application settings for authenticated users.
 */
export default defineEventHandler(async (event): Promise<SettingsListResponse> => {
  await requireUserFromToken(event)

  const dataSource = await getDataSource()
  const settings = await dataSource.getRepository(AppSetting).find({
    order: { key: 'ASC' }
  })

  return {
    settings: settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updated_at: setting.updatedAt.toISOString()
    }))
  }
})
