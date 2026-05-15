import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

import { migrations } from '../migrations/index'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const migrationDir = path.resolve(__dirname, '../migrations')

export type CreateDatabaseAdapterOptions = {
  connectionString?: string
  push?: boolean
}

export function createDatabaseAdapter(
  options: CreateDatabaseAdapterOptions = {},
): ReturnType<typeof postgresAdapter> {
  return postgresAdapter({
    pool: {
      connectionString: options.connectionString ?? process.env.DATABASE_URL ?? '',
    },
    push: options.push ?? false,
    migrationDir,
    prodMigrations: migrations,
  })
}

export { migrations }
export type { PostgresAdapter }
