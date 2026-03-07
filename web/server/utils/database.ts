import { createError } from 'h3'
import { AppDataSource } from '../database/data-source'

let initializePromise: Promise<typeof AppDataSource> | null = null

/**
 * Returns a singleton initialized TypeORM data source instance.
 */
export async function getDataSource(): Promise<typeof AppDataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource
  }

  if (!initializePromise) {
    initializePromise = AppDataSource.initialize().catch((error) => {
      initializePromise = null
      throw createError({
        statusCode: 500,
        statusMessage: `Database initialization failed: ${String(error)}`
      })
    })
  }

  return initializePromise
}
