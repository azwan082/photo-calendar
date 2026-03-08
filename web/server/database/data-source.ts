import 'reflect-metadata'
import { DataSource, EntitySchema } from 'typeorm'

let AppDataSource: DataSource | null = null

/**
 * Creates a new TypeORM DataSource instance using EntitySchemas.
 * This approach avoids decorator evaluation during build time.
 */
export async function createDataSource(): Promise<DataSource> {
  if (!AppDataSource) {
    // Load entity schemas dynamically to prevent build-time evaluation
    const UserSchema = (await import('./entities/user.schema')).UserSchema
    const SocialAccountSchema = (await import('./entities/social-account.schema')).SocialAccountSchema
    const PostSchema = (await import('./entities/post.schema')).PostSchema
    const MediaSchema = (await import('./entities/media.schema')).MediaSchema
    const SyncLogSchema = (await import('./entities/sync-log.schema')).SyncLogSchema
    const AppSettingSchema = (await import('./entities/app-setting.schema')).AppSettingSchema

    AppDataSource = new DataSource({
      type: 'mariadb',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'photo_calendar',
      entities: [UserSchema, SocialAccountSchema, PostSchema, MediaSchema, SyncLogSchema, AppSettingSchema],
      migrations: ['server/database/migrations/*{.ts,.js}'],
      migrationsTableName: 'TYPEORM_MIGRATIONS',
      synchronize: false,
      logging: false
    })
  }
  return AppDataSource
}

export function getInitializedDataSource(): DataSource | null {
  return AppDataSource
}
