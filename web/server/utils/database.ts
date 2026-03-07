import { createError } from 'h3'
import type { DataSource } from 'typeorm'

let initializePromise: Promise<DataSource> | null = null
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<{ AppDataSource: DataSource }>

/**
 * Returns a singleton initialized TypeORM data source instance.
 */
export async function getDataSource(): Promise<DataSource> {
  const { AppDataSource } = await dynamicImport('../database/data-source')

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
