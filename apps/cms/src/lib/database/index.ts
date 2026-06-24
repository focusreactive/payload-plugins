import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import type { PostgresAdapter } from "@payloadcms/db-postgres";

import { migrations } from "./migrations/index";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export const migrationDir = path.resolve(baseDir, "migrations");

export interface CreateDatabaseAdapterOptions {
  connectionString?: string;
  push?: boolean;
}

function normalizeSslMode(connectionString: string): string {
  return connectionString.replace(/sslmode=(?:prefer|require|verify-ca)\b/u, "sslmode=verify-full");
}

export function createDatabaseAdapter(
  options: CreateDatabaseAdapterOptions = {}
): ReturnType<typeof postgresAdapter> {
  return postgresAdapter({
    migrationDir,
    pool: {
      connectionString: normalizeSslMode(
        options.connectionString ?? process.env.DATABASE_URL ?? ""
      ),
    },
    prodMigrations: migrations,
    push: options.push ?? false,
  });
}

export { migrations };
export type { PostgresAdapter };
