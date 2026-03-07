import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  AppSetting,
  Media,
  Post,
  SocialAccount,
  SyncLog,
  User
} from './entities'

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'photo_calendar',
  entities: [User, SocialAccount, Post, Media, SyncLog, AppSetting],
  migrations: ['server/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'TYPEORM_MIGRATIONS',
  synchronize: false,
  logging: false
})
