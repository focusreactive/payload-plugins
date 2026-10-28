import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { getPayload } from "payload";
import type { Config, Payload, SanitizedConfig } from "payload";

import { buildDevConfig } from "../../dev/payload.config.js";
import { postgresConnectionEnvironmentKey } from "./postgresGlobalSetup.js";

export type TestDatabaseKind = "postgres" | "sqlite";

export type TestPayload = {
  config: SanitizedConfig;
  databaseKind: TestDatabaseKind;
  /** Destroys the Payload instance and removes this file's database. */
  destroy: () => Promise<void>;
  payload: Payload;
};

type TestDatabase = {
  adapter: Config["db"];
  cleanup: () => Promise<void>;
};

const createSqliteDatabase = async (): Promise<TestDatabase> => {
  const directory = await mkdtemp(path.join(tmpdir(), "folders-sqlite-"));

  return {
    // transactionOptions: {} turns real transactions on; without it SQLite transactions are no-ops.
    adapter: sqliteAdapter({
      client: { url: `file:${path.join(directory, "test.db")}` },
      transactionOptions: {},
    }),
    cleanup: () => rm(directory, { force: true, recursive: true }),
  };
};

const createPostgresDatabase = async (): Promise<TestDatabase> => {
  const connectionString = process.env[postgresConnectionEnvironmentKey];
  if (!connectionString) {
    throw new Error(
      "Postgres is not running: run the tests through `npm run test:int:postgres`, which starts it"
    );
  }

  // A fresh schema per test file keeps files independent on one shared cluster.
  const schemaName = `test_${randomUUID().replaceAll("-", "")}`;
  const adminPool = new Pool({ connectionString, max: 1 });
  await adminPool.query(`CREATE SCHEMA "${schemaName}"`);

  return {
    adapter: postgresAdapter({ pool: { connectionString }, schemaName }),
    cleanup: async () => {
      await adminPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      await adminPool.end();
    },
  };
};

export const getTestPayload = async (): Promise<TestPayload> => {
  const databaseKind: TestDatabaseKind = process.env.TEST_DB === "postgres" ? "postgres" : "sqlite";
  const database =
    databaseKind === "postgres" ? await createPostgresDatabase() : await createSqliteDatabase();

  // Auto-login is for browsers; the tests authenticate explicitly through callEndpoint.
  const config = await buildDevConfig({ autoLogin: false, db: database.adapter });
  const payload = await getPayload({ config });

  return {
    config,
    databaseKind,
    destroy: async () => {
      await payload.destroy();
      await database.cleanup();
    },
    payload,
  };
};
