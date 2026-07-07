import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";

/**
 * Pick the Payload DB adapter from `DB_ADAPTER` so the dev app can be verified against SQLite,
 * Postgres and MongoDB in turn (see docs/multi-db-verification.md). Defaults to SQLite — today's
 * behaviour.
 *
 * SQL adapters use `push` (auto-sync schema) by default so a fresh Docker DB comes up ready without a
 * migration step; set `PAYLOAD_DB_PUSH=false` to disable. Mongo needs no schema push. Connection
 * strings default to the Docker Compose services (docker-compose.yml), overridable via env.
 */
export function resolveDbAdapter() {
  const push = process.env.PAYLOAD_DB_PUSH === "false" ? false : undefined;

  switch (process.env.DB_ADAPTER) {
    case "postgres":
      return postgresAdapter({
        pool: {
          connectionString:
            process.env.POSTGRES_URL ?? "postgres://payload:payload@localhost:5434/payload",
        },
        push,
      });
    case "mongo":
    case "mongodb":
      return mongooseAdapter({
        url: process.env.MONGO_URL ?? "mongodb://localhost:27017/payload",
      });
    default:
      return sqliteAdapter({
        client: { url: process.env.DATABASE_URL || "file:./dev.db" },
        push,
      });
  }
}
