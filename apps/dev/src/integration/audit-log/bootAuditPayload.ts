import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { auditLogPlugin } from "@focus-reactive/payload-plugin-audit-log";
import type { AuditLogPluginOptions } from "@focus-reactive/payload-plugin-audit-log";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig, getPayload, handleEndpoints } from "payload";
import type {
  CollectionAfterChangeHook,
  CollectionAfterOperationHook,
  CollectionConfig,
  DatabaseAdapterObj,
  GlobalBeforeChangeHook,
  GlobalBeforeValidateHook,
  GlobalConfig,
  Payload,
  PayloadRequest,
  Plugin,
} from "payload";
import type { MockInstance } from "vitest";

import { createTestDatabase } from "../../lib/database/resolveAdapter";

export type AuditTestPayload = {
  payload: Payload;
  cleanup: () => Promise<void>;
  settingsAfterChangeHookCalls: () => number;
};

export type AuditEventRow = Record<string, any>;

export const AUDIT_SLUG = "audit-events";
export const PASSWORD = "password123";
export const MAX_LOGIN_ATTEMPTS = 3;
export const SERVICE_KEYS_SLUG = "service-keys";
export const ACCESS_ROLES_SLUG = "access-roles";

const AUDIT_LOG_MESSAGE_PREFIX = "[payload-plugin-audit-log]";

export const dbAdapterName = (): "sqlite" | "postgres" | "mongo" => {
  const name = process.env.DB_ADAPTER;
  if (name === "postgres") return "postgres";
  if (name === "mongo" || name === "mongodb") return "mongo";
  return "sqlite";
};

export const isoNow = () => new Date().toISOString();

export const timestampAfterEverythingSoFar = async () => {
  const startedAt = Date.now();
  while (Date.now() === startedAt) {
    await sleep(1);
  }
  return isoNow();
};

export const POST_HOOK_FLAGS = {
  createNestedPostTitled: "testNestedCreateTitle",
  rawUpdatePostWithId: "testRawUpdateOtherId",
  rawCreatePostTitled: "testRawCreatePostTitle",
  rawDeleteManyPostsTitled: "testRawDeleteManyPostsTitle",
  throwAfterAuditWrite: "testFailAfterAudit",
} as const;

export const HEADER_HOOK_FLAGS = {
  readHeaderTaglineInHooks: "testReadHeaderTaglineInHooks",
} as const;

const consumeContextFlag = (req: PayloadRequest, key: string): unknown => {
  const value = req.context?.[key];
  if (value !== undefined) req.context[key] = undefined;
  return value;
};

const createNestedPostWhenFlagged: CollectionAfterChangeHook = async ({ operation, req }) => {
  const title = consumeContextFlag(req, POST_HOOK_FLAGS.createNestedPostTitled);
  if (operation === "create" && typeof title === "string") {
    await req.payload.create({ collection: "posts" as never, data: { title } as never, req });
  }
};

const rawUpdateFlaggedPost: CollectionAfterChangeHook = async ({ req }) => {
  const postId = consumeContextFlag(req, POST_HOOK_FLAGS.rawUpdatePostWithId);
  if (postId !== undefined) {
    await req.payload.db.updateOne({
      collection: "posts",
      id: postId as string | number,
      data: { title: "side effect" },
      req,
    });
  }
};

const rawCreatePostWhenFlagged: CollectionAfterChangeHook = async ({ req }) => {
  const title = consumeContextFlag(req, POST_HOOK_FLAGS.rawCreatePostTitled);
  if (typeof title === "string") {
    await req.payload.db.create({ collection: "posts", data: { title }, req });
  }
};

const rawDeleteManyPostsWhenFlagged: CollectionAfterChangeHook = async ({ req }) => {
  const title = consumeContextFlag(req, POST_HOOK_FLAGS.rawDeleteManyPostsTitled);
  if (typeof title === "string") {
    await req.payload.db.deleteMany({
      collection: "posts",
      where: { title: { equals: title } },
      req,
    });
  }
};

const throwAfterAuditWriteWhenFlagged: CollectionAfterOperationHook = ({ req, result }) => {
  if (consumeContextFlag(req, POST_HOOK_FLAGS.throwAfterAuditWrite)) {
    throw new Error("project hook failed");
  }
  return result;
};

const readHeaderTaglineWhenFlagged = async (req: PayloadRequest) => {
  if (!req.context?.[HEADER_HOOK_FLAGS.readHeaderTaglineInHooks]) return;
  await req.payload.findGlobal({ slug: "header" as never, select: { tagline: true }, req });
  await req.payload.db.findGlobal({ slug: "header", select: { tagline: true }, req });
};

const readHeaderBeforeValidate: GlobalBeforeValidateHook = async ({ data, req }) => {
  await readHeaderTaglineWhenFlagged(req);
  return data;
};

const readHeaderBeforeChange: GlobalBeforeChangeHook = async ({ data, req }) => {
  await readHeaderTaglineWhenFlagged(req);
  return data;
};

function buildCollections(staticDir: string): CollectionConfig[] {
  return [
    {
      slug: "users",
      auth: { maxLoginAttempts: MAX_LOGIN_ATTEMPTS, lockTime: 60_000 },
      admin: { useAsTitle: "email" },
      fields: [
        { name: "role", type: "select", options: ["editor", "admin"], defaultValue: "editor" },
        { name: "name", type: "text" },
        { name: "bio", type: "text" },
        { name: "nickname", type: "text", localized: true },
        { name: "internalNote", type: "text", hidden: true },
        { name: "privateNote", type: "text", access: { read: () => false } },
        { name: "roles", type: "relationship", relationTo: ACCESS_ROLES_SLUG, hasMany: true },
        {
          name: "profile",
          type: "group",
          fields: [
            { name: "headline", type: "text" },
            { name: "taxId", type: "text", hidden: true },
          ],
        },
        {
          name: "badges",
          type: "blocks",
          blocks: [
            {
              slug: "badge",
              fields: [
                { name: "label", type: "text" },
                { name: "caption", type: "text", localized: true },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: ACCESS_ROLES_SLUG,
      admin: { useAsTitle: "name" },
      fields: [{ name: "name", type: "text" }],
    },
    {
      slug: "members",
      auth: { verify: true },
      fields: [{ name: "name", type: "text" }],
    },
    {
      slug: "posts",
      admin: { useAsTitle: "title" },
      versions: { drafts: true },
      trash: true,
      fields: [
        { name: "title", type: "text" },
        { name: "seo", type: "group", fields: [{ name: "description", type: "text" }] },
        { name: "author", type: "relationship", relationTo: "users" },
        { name: "comments", type: "join", collection: "comments", on: "post" },
      ],
      hooks: {
        afterChange: [
          createNestedPostWhenFlagged,
          rawUpdateFlaggedPost,
          rawCreatePostWhenFlagged,
          rawDeleteManyPostsWhenFlagged,
        ],
        afterOperation: [throwAfterAuditWriteWhenFlagged],
      },
    },
    {
      slug: "pages",
      admin: { useAsTitle: "title" },
      versions: { drafts: { autosave: true, schedulePublish: true } },
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "related", type: "relationship", relationTo: "posts" },
        { name: "notes", type: "join", collection: "comments", on: "page" },
        {
          name: "titleUpper",
          type: "text",
          virtual: true,
          hooks: {
            afterRead: [
              ({ siblingData }) =>
                typeof siblingData?.title === "string" ? siblingData.title.toUpperCase() : null,
            ],
          },
        },
      ],
    },
    {
      slug: "comments",
      fields: [
        { name: "text", type: "text" },
        { name: "post", type: "relationship", relationTo: "posts" },
        { name: "page", type: "relationship", relationTo: "pages" },
        {
          name: "profile",
          type: "group",
          fields: [
            { name: "headline", type: "text" },
            { name: "taxId", type: "text", hidden: true },
            { name: "pin", type: "text", access: { read: () => false } },
          ],
        },
        {
          name: "contacts",
          type: "array",
          fields: [
            { name: "label", type: "text" },
            { name: "phone", type: "text", access: { read: () => false } },
          ],
        },
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "secretNote",
              fields: [
                { name: "heading", type: "text" },
                { name: "secret", type: "text", hidden: true },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "integrations",
      auth: { useAPIKey: true, disableLocalStrategy: true },
      fields: [{ name: "name", type: "text" }],
    },
    {
      slug: SERVICE_KEYS_SLUG,
      auth: { useAPIKey: true, disableLocalStrategy: true },
      admin: { useAsTitle: "label" },
      fields: [{ name: "label", type: "text" }],
    },
    {
      slug: "articles",
      admin: { useAsTitle: "note" },
      versions: { drafts: { autosave: true } },
      fields: [
        { name: "title", type: "text", localized: true },
        { name: "note", type: "text" },
        {
          name: "sections",
          type: "array",
          fields: [
            { name: "heading", type: "text" },
            { name: "caption", type: "text", localized: true },
          ],
        },
      ],
    },
    {
      slug: "staff",
      auth: { useAPIKey: true },
      versions: { drafts: { autosave: true } },
      fields: [{ name: "role", type: "select", options: ["editor", "admin"] }],
    },
    {
      slug: "contractors",
      auth: { useAPIKey: true },
      versions: { drafts: true },
      fields: [{ name: "role", type: "select", options: ["editor", "admin"] }],
    },
    {
      slug: "media",
      upload: { staticDir },
      fields: [{ name: "alt", type: "text" }],
    },
  ];
}

function buildGlobals(onSettingsChange: () => void): GlobalConfig[] {
  return [
    {
      slug: "settings",
      fields: [{ name: "siteName", type: "text" }],
      hooks: { afterChange: [() => onSettingsChange()] },
    },
    {
      slug: "header",
      versions: { drafts: { autosave: true } },
      fields: [
        { name: "title", type: "text" },
        { name: "tagline", type: "text" },
      ],
      hooks: {
        beforeValidate: [readHeaderBeforeValidate],
        beforeChange: [readHeaderBeforeChange],
      },
    },
    {
      slug: "notices",
      fields: [
        { name: "headline", type: "text" },
        { name: "footer", type: "text" },
      ],
    },
    {
      slug: "localized-settings",
      fields: [{ name: "motto", type: "text", localized: true }],
    },
    {
      slug: "banner",
      versions: { drafts: true },
      fields: [
        { name: "text", type: "text" },
        { name: "motto", type: "text", localized: true },
        { name: "token", type: "text", hidden: true },
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    },
    {
      slug: "secret-settings",
      fields: [
        { name: "visible", type: "text" },
        { name: "token", type: "text", hidden: true },
        {
          name: "links",
          type: "array",
          fields: [
            { name: "label", type: "text" },
            { name: "secret", type: "text", hidden: true },
          ],
        },
      ],
    },
    {
      slug: "promo",
      versions: { drafts: { autosave: true } },
      fields: [
        { name: "title", type: "text", localized: true },
        { name: "note", type: "text" },
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    },
    {
      slug: "localized-rows",
      fields: [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    },
  ];
}

const randomDatabaseName = () => `audit_t${randomUUID().replaceAll("-", "")}`;

function databaseUrl(server: string, database: string): string {
  const url = new URL(server);
  url.pathname = `/${database}`;
  return url.toString();
}

async function dropPostgresDatabase(server: string, database: string): Promise<void> {
  const { default: pg } = await import("pg");
  const maintenance = new pg.Client({ connectionString: databaseUrl(server, "postgres") });
  await maintenance.connect();
  try {
    await maintenance.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  } finally {
    await maintenance.end();
  }
}

type TestDatabase = {
  db: DatabaseAdapterObj;
  dropWhileConnected?: (payload: Payload) => Promise<void>;
  closeConnections?: (payload: Payload) => Promise<void>;
  dropAfterDisconnect?: () => Promise<void>;
};

function isolatedPostgresDatabase(server: string): TestDatabase {
  const database = randomDatabaseName();
  return {
    db: postgresAdapter({ pool: { connectionString: databaseUrl(server, database) } }),
    closeConnections: (payload) => payload.db.pool.end(),
    dropAfterDisconnect: () => dropPostgresDatabase(server, database),
  };
}

function testDatabase(dir: string, enableSqliteTransactions: boolean): TestDatabase {
  const sqliteFile = join(dir, "test.db");
  const isolatedPostgresServer = process.env.AUDIT_PG_SERVER;
  if (dbAdapterName() === "postgres" && isolatedPostgresServer) {
    return isolatedPostgresDatabase(isolatedPostgresServer);
  }
  if (dbAdapterName() === "sqlite" && enableSqliteTransactions) {
    return { db: sqliteAdapter({ client: { url: `file:${sqliteFile}` }, transactionOptions: {} }) };
  }
  const { db, drop } = createTestDatabase(sqliteFile);
  return { db, dropWhileConnected: drop };
}

const instanceCacheKeys = new WeakMap<Payload, string>();

async function warnOnFailure(what: string, run: () => Promise<unknown> | undefined) {
  try {
    await run();
  } catch (error) {
    console.warn(`[bootAuditPayload] could not ${what}: ${(error as Error).message}`);
  }
}

const DEFAULT_POSTGRES_SERVER = "postgres://payload:payload@localhost:5434";

const postgresTestServer = (): string =>
  process.env.AUDIT_PG_SERVER ?? process.env.POSTGRES_TEST_URL ?? DEFAULT_POSTGRES_SERVER;
const DEFAULT_MONGO_SERVER = "mongodb://localhost:27017";

type DevAppDatabase = {
  env: Record<string, string>;
  closeConnections: (payload: Payload) => Promise<unknown>;
  drop: (payload: Payload) => Promise<unknown>;
};

const nothingToDo = () => Promise.resolve();

function devAppDatabase(dir: string): DevAppDatabase {
  const database = randomDatabaseName();
  if (dbAdapterName() === "postgres") {
    const server = postgresTestServer();
    return {
      env: { POSTGRES_URL: databaseUrl(server, database) },
      closeConnections: (payload) => payload.db.pool.end(),
      drop: () => dropPostgresDatabase(server, database),
    };
  }
  if (dbAdapterName() === "mongo") {
    const server = process.env.MONGO_TEST_SERVER ?? DEFAULT_MONGO_SERVER;
    return {
      env: { MONGO_URL: databaseUrl(server, database) },
      closeConnections: nothingToDo,
      drop: (payload) =>
        (
          payload.db as unknown as { connection: { dropDatabase: () => Promise<unknown> } }
        ).connection.dropDatabase(),
    };
  }
  return {
    env: { DATABASE_URL: `file:${join(dir, "dev.db")}` },
    closeConnections: nothingToDo,
    drop: nothingToDo,
  };
}

export async function bootDevAppPayload(): Promise<{
  payload: Payload;
  cleanup: () => Promise<void>;
}> {
  const dir = mkdtempSync(join(tmpdir(), "audit-dev-app-"));
  const database = devAppDatabase(dir);
  Object.assign(process.env, database.env, { PAYLOAD_SECRET: "audit-dev-app-secret" });
  const { default: devAppConfig } = await import("../../payload.config");
  const sanitizedConfig = await devAppConfig;
  const config = {
    ...sanitizedConfig,
    typescript: { ...sanitizedConfig.typescript, autoGenerate: false },
  };
  const payload = await getPayload({ config });
  const dropsWhileConnected = dbAdapterName() === "mongo";
  const cleanup = async () => {
    if (dropsWhileConnected)
      await warnOnFailure("drop the test database", () => database.drop(payload));
    await warnOnFailure("disconnect", () => payload.db.destroy?.());
    await warnOnFailure("close the connections", () => database.closeConnections(payload));
    if (!dropsWhileConnected)
      await warnOnFailure("drop the test database", () => database.drop(payload));
    rmSync(dir, { recursive: true, force: true });
  };
  return { payload, cleanup };
}

export async function bootAuditPayload(options?: {
  plugin?: AuditLogPluginOptions;
  pluginsAfterAudit?: Plugin[];
  enableSqliteTransactions?: boolean;
  localizationFallback?: boolean;
  key?: string;
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
}): Promise<AuditTestPayload> {
  const dir = mkdtempSync(join(tmpdir(), "audit-int-"));
  const database = testDatabase(dir, options?.enableSqliteTransactions ?? false);

  let settingsAfterChangeHookCalls = 0;
  const config = await buildConfig({
    secret: "audit-integration-secret",
    db: database.db,
    editor: lexicalEditor(),
    telemetry: false,
    typescript: { autoGenerate: false },
    admin: { user: "users" },
    localization: {
      defaultLocale: "en",
      fallback: options?.localizationFallback ?? false,
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
      ],
    },
    collections: [...buildCollections(join(dir, "media")), ...(options?.collections ?? [])],
    globals: [
      ...buildGlobals(() => {
        settingsAfterChangeHookCalls += 1;
      }),
      ...(options?.globals ?? []),
    ],
    plugins: [
      auditLogPlugin({
        apiKeyCollections: ["payload-mcp-api-keys", SERVICE_KEYS_SLUG],
        ...options?.plugin,
      }),
      ...(options?.pluginsAfterAudit ?? []),
    ],
  });

  const payload = await getPayload({ config, key: options?.key });
  if (options?.key) instanceCacheKeys.set(payload, options.key);
  const cleanup = async () => {
    await warnOnFailure("drop the test namespace", () => database.dropWhileConnected?.(payload));
    await warnOnFailure("disconnect", () => payload.db.destroy?.());
    await warnOnFailure("close the connections", () => database.closeConnections?.(payload));
    await warnOnFailure("drop the test database", () => database.dropAfterDisconnect?.());
    rmSync(dir, { recursive: true, force: true });
  };
  return {
    payload,
    cleanup,
    settingsAfterChangeHookCalls: () => settingsAfterChangeHookCalls,
  };
}

const OLDEST_FIRST_WITH_ID_AS_TIEBREAKER = ["occurredAt", "id"];

export async function events(
  payload: Payload,
  where: Record<string, unknown> = {}
): Promise<AuditEventRow[]> {
  const { docs } = await payload.find({
    collection: AUDIT_SLUG as never,
    where: where as never,
    sort: OLDEST_FIRST_WITH_ID_AS_TIEBREAKER as never,
    limit: 1000,
    depth: 0,
  });
  return docs as unknown as AuditEventRow[];
}

export const eventsWithAction = (payload: Payload, action: string) =>
  events(payload, { action: { equals: action } });

export const unattributedEvents = (payload: Payload) =>
  eventsWithAction(payload, "system.unattributed_write");

export const targetEvents = (payload: Payload, slug: string, id: unknown, occurredSince = "") =>
  events(payload, {
    and: [
      { "target.slug": { equals: slug } },
      { "target.docId": { equals: String(id) } },
      ...(occurredSince ? [{ occurredAt: { greater_than_equal: occurredSince } }] : []),
    ],
  });

export const targetActions = async (
  payload: Payload,
  slug: string,
  id: unknown,
  occurredSince = ""
) => (await targetEvents(payload, slug, id, occurredSince)).map((event) => event.action);

export const createUser = (payload: Payload, email: string, data: Record<string, unknown> = {}) =>
  payload.create({
    collection: "users" as never,
    data: { email, password: PASSWORD, ...data } as never,
  });

export const createTextUpload = (payload: Payload) =>
  payload.create({
    collection: "media" as never,
    data: { alt: "a" } as never,
    file: { data: Buffer.from("hello"), mimetype: "text/plain", name: "hello.txt", size: 5 },
  });

export function rest(
  payload: Payload,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options?: { body?: unknown; headers?: Record<string, string> }
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (options?.body !== undefined) headers.set("content-type", "application/json");
  const request = new Request(`http://localhost:3000/api${path}`, {
    method,
    headers,
    ...(options?.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return handleEndpoints({
    config: payload.config,
    request,
    payloadInstanceCacheKey: instanceCacheKeys.get(payload),
  });
}

export async function loginHeaders(
  payload: Payload,
  email: string,
  collection = "users"
): Promise<{ authorization: string }> {
  const res = await rest(payload, "POST", `/${collection}/login`, {
    body: { email, password: PASSWORD },
  });
  if (res.status !== 200) throw new Error(`login of ${email} failed with ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  return { authorization: `JWT ${token}` };
}

export function authCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = /payload-token=([^;]+)/u.exec(setCookie);
  if (!match) throw new Error(`no payload-token cookie in: ${setCookie}`);
  return `payload-token=${match[1]}`;
}

export const auditErrorMessages = (errorLog: MockInstance) =>
  errorLog.mock.calls
    .map(([first]) =>
      typeof first === "string" ? first : String((first as { msg?: unknown }).msg)
    )
    .filter((message) => message.startsWith(AUDIT_LOG_MESSAGE_PREFIX));

export const mentionsAbortedTransaction = (errorLog: MockInstance) =>
  JSON.stringify(errorLog.mock.calls).includes("current transaction is aborted");

async function rawSql(payload: Payload, sql: string, connection?: unknown): Promise<void> {
  const db = payload.db as unknown as {
    drizzle: unknown;
    execute: (args: { drizzle: unknown; raw: string }) => Promise<unknown>;
  };
  await db.execute({ drizzle: connection ?? db.drizzle, raw: sql });
}

const AUDIT_TABLE = "audit_events";
const HIDDEN_AUDIT_TABLE = "audit_events_not_migrated_yet";

function tableName(payload: Payload, table: string): string {
  const schema = (payload.db as unknown as { schemaName?: string }).schemaName;
  return schema ? `"${schema}"."${table}"` : `"${table}"`;
}

function auditTable(payload: Payload): string {
  return tableName(payload, AUDIT_TABLE);
}

const renameTable = (payload: Payload, from: string, to: string, connection?: unknown) =>
  rawSql(payload, `ALTER TABLE ${tableName(payload, from)} RENAME TO "${to}"`, connection);

export const hideAuditTable = (payload: Payload, connection?: unknown) =>
  renameTable(payload, AUDIT_TABLE, HIDDEN_AUDIT_TABLE, connection);

export const restoreAuditTable = (payload: Payload, connection?: unknown) =>
  renameTable(payload, HIDDEN_AUDIT_TABLE, AUDIT_TABLE, connection);

async function blockAuditInserts(
  payload: Payload,
  onlyForDocId?: string | number
): Promise<() => Promise<void>> {
  const table = auditTable(payload);
  const blockedDocId =
    onlyForDocId === undefined ? undefined : `'${String(onlyForDocId).replaceAll("'", "''")}'`;

  if (dbAdapterName() === "postgres") {
    const rowsAllowed = blockedDocId ? `target_doc_id <> ${blockedDocId}` : "false";
    await rawSql(
      payload,
      `ALTER TABLE ${table} ADD CONSTRAINT audit_block CHECK (${rowsAllowed}) NOT VALID`
    );
    return () => rawSql(payload, `ALTER TABLE ${table} DROP CONSTRAINT audit_block`);
  }

  const onlyWhenBlockedDoc = blockedDocId ? `WHEN NEW.target_doc_id = ${blockedDocId}` : "";
  await rawSql(
    payload,
    `CREATE TRIGGER audit_block BEFORE INSERT ON ${table} ${onlyWhenBlockedDoc} BEGIN SELECT RAISE(ABORT, 'audit blocked'); END`
  );
  return () => rawSql(payload, "DROP TRIGGER audit_block");
}

export async function withAuditInsertsBlocked<T>(
  payload: Payload,
  run: () => Promise<T>,
  options?: { onlyForDocId?: string | number }
): Promise<T> {
  const unblock = await blockAuditInserts(payload, options?.onlyForDocId);
  try {
    return await run();
  } finally {
    await unblock();
  }
}
