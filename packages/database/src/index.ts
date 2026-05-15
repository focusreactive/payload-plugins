import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import type { PostgresAdapter } from "@payloadcms/db-postgres";

import { migrations } from "../migrations/index";

const __dirname = import.meta.dirname;

export const migrationDir = path.resolve(__dirname, "../migrations");

export interface CreateDatabaseAdapterOptions {
  connectionString?: string;
  push?: boolean;
}

export function createDatabaseAdapter(
  options: CreateDatabaseAdapterOptions = {}
): ReturnType<typeof postgresAdapter> {
  return postgresAdapter({
    migrationDir,
    pool: {
      connectionString:
        options.connectionString ?? process.env.DATABASE_URL ?? "",
    },
    prodMigrations: migrations,
    push: options.push ?? false,
  });
}

export { migrations };
export type { PostgresAdapter };
