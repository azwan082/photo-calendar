import { createError } from 'h3'
import type { DataSource } from 'typeorm'

/**
 * Returns the singleton initialized TypeORM data source instance.
 * This function is server-only and relies on the database plugin initialization.
 * 
 * IMPORTANT: This function should only be called from server-side API routes.
 * Never import or call this function from client-side code (app/, pages/, components/).
 */
export async function getDataSource(): Promise<DataSource> {
  // Check if we're on the server side
  if (typeof globalThis.__DATABASE_SOURCE__ === 'undefined') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database can only be accessed from server-side code'
    })
  }

  if (!globalThis.__DATABASE_SOURCE__) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database not initialized. The database plugin may have failed to load.'
    })
  }

  return globalThis.__DATABASE_SOURCE__
}
