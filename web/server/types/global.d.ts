import type { DataSource } from 'typeorm'

declare global {
  var __DATABASE_SOURCE__: DataSource | null
}

export {}
