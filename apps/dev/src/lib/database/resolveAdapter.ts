import { randomUUID } from "node:crypto";

import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import type { Payload } from "payload";

const DEFAULT_POSTGRES_URL = "postgres://payload:payload@localhost:5434/payload";
// A database of its own, not a schema inside the app's. Payload documents `schemaName` as
// experimental and working "only when there are not other tables or enums of the same name in the
// database under a different schema" — and the test collections collide with the dev app's by
// construction. Anyone who has run `DB_ADAPTER=postgres bun run dev` would otherwise start seeing
// unexplained failures. Postgres creates it on first connect (`disableCreateDatabase` defaults off).
const DEFAULT_POSTGRES_TEST_URL = "postgres://payload:payload@localhost:5434/payload_test";

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
          connectionString: process.env.POSTGRES_URL ?? DEFAULT_POSTGRES_URL,
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

/**
 * The database an integration-test boot runs against, plus the teardown that removes it.
 *
 * Postgres and Mongo keep data between runs and every spec file boots against the same server, so
 * each boot gets a namespace of its own — a Postgres schema, a Mongo database. `drop` closes over
 * that name, which is why the two arrive together: a branch here that creates a namespace without a
 * matching teardown would leak it silently. SQLite needs none of it; `sqliteFile` is a throwaway per
 * boot and the caller deletes it.
 *
 * An unrecognised `DB_ADAPTER` throws rather than falling back: a typo that silently ran SQLite would
 * report a green run for a database it never touched.
 */
export function createTestDatabase(sqliteFile: string) {
  switch (process.env.DB_ADAPTER) {
    case "postgres": {
      // The leading "t" makes it a valid unquoted Postgres identifier — those cannot start with a digit.
      const schema = `t${randomUUID().replaceAll("-", "")}`;
      return {
        db: postgresAdapter({
          pool: { connectionString: process.env.POSTGRES_TEST_URL ?? DEFAULT_POSTGRES_TEST_URL },
          schemaName: schema,
        }),
        drop: async (payload: Payload) => {
          // Not Payload's own `dropDatabase()`: that one drops the schema and immediately recreates
          // it, which would leave an empty schema behind per boot. A schema name cannot be a bound
          // parameter, so it is interpolated — `schema` is built from `randomUUID()` above, never
          // from input.
          const { pool } = payload.db as { pool: { query: (q: string) => Promise<unknown> } };
          await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        },
      };
    }
    case "mongo":
    case "mongodb": {
      // Not `MONGO_URL`: that one already names a database, so a run id appended to it is a collection.
      const server = process.env.MONGO_TEST_SERVER ?? "mongodb://localhost:27017";
      return {
        db: mongooseAdapter({ url: `${server}/t${randomUUID().replaceAll("-", "")}` }),
        drop: async (payload: Payload) => {
          const { connection } = payload.db as {
            connection: { dropDatabase: () => Promise<unknown> };
          };
          await connection.dropDatabase();
        },
      };
    }
    case undefined:
    case "sqlite":
      return {
        db: sqliteAdapter({ client: { url: `file:${sqliteFile}` } }),
        drop: () => Promise.resolve(),
      };
    default:
      throw new Error(
        `Unknown DB_ADAPTER "${process.env.DB_ADAPTER}" — expected sqlite, postgres or mongo`
      );
  }
}
