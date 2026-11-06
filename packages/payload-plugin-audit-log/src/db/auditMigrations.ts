import type { Payload, PayloadRequest } from "payload";
import { MIGRATIONS_COLLECTION } from "../constants";
import { withAuditActor } from "../core/actorScope";
import { auditTarget } from "../core/auditTarget";
import { bufferAuditWritesUntilCommandEnds } from "../core/commandWriteBuffer";
import { readForAudit, writeCommandEventsOnceCommitted } from "../core/failOpenInsert";
import { buildEvent, standaloneLocalReq, writeAuditEvent } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import { logError } from "../utils/logError";

type MigrationRow = { id?: unknown; name?: unknown; batch?: unknown };
type Direction = "up" | "down";

type DbArgs = {
  collection?: string;
  where?: Record<string, unknown>;
  data?: MigrationRow;
  req?: PayloadRequest;
};

type DbMethod = (this: unknown, args: DbArgs) => Promise<unknown>;
type MigrationCommand = (this: unknown, ...args: unknown[]) => Promise<unknown>;

const MIGRATIONS_AUDITED = Symbol.for("payload-plugin-audit-log.migrationsAudited");

const CLI_COMMAND_BY_METHOD = {
  migrate: "migrate",
  migrateDown: "migrate:down",
  migrateFresh: "migrate:fresh",
  migrateRefresh: "migrate:refresh",
  migrateReset: "migrate:reset",
} as const;

const DEV_PUSH_BATCH = -1;

const isMigrationRow = (args: DbArgs | undefined): boolean =>
  args?.collection === MIGRATIONS_COLLECTION;

const migrationName = (row: MigrationRow): string | undefined =>
  typeof row.name === "string" ? row.name : undefined;

export function auditMigrations(payload: Payload, opts: ResolvedOptions, adapter: unknown): void {
  const db = adapter as Record<string | symbol, unknown>;
  if (!db || db[MIGRATIONS_AUDITED]) return;
  db[MIGRATIONS_AUDITED] = true;

  const recordMigration = async (
    row: MigrationRow | null | undefined,
    direction: Direction,
    req: PayloadRequest | undefined
  ) => {
    if (!row || row.batch === DEV_PUSH_BATCH) return;
    const name = migrationName(row);
    let event;
    try {
      event = buildEvent(req ?? standaloneLocalReq(), {
        action: "system.migration",
        target: auditTarget("system", MIGRATIONS_COLLECTION, row.id, name),
        localized: false,
        metadata: { name, batch: row.batch ?? null, direction },
      });
    } catch (err) {
      logError(payload, "could not build the migration event", err);
      return;
    }
    await writeAuditEvent(payload, opts.slug, event, req);
    await writeCommandEventsOnceCommitted(payload, req);
  };

  const readRowBeforeDelete = (args: DbArgs): Promise<MigrationRow | null | undefined> =>
    readForAudit(
      payload,
      args.req,
      async () =>
        (await (db.findOne as DbMethod).call(db, {
          collection: MIGRATIONS_COLLECTION,
          where: args.where,
          req: args.req,
        })) as MigrationRow | null,
      "could not read the migration row being deleted"
    );

  for (const [method, command] of Object.entries(CLI_COMMAND_BY_METHOD)) {
    const original = db[method];
    if (typeof original !== "function") continue;
    db[method] = function runAsMigration(this: unknown, ...args: unknown[]) {
      return withAuditActor({ type: "migration", label: command }, () =>
        bufferAuditWritesUntilCommandEnds(payload, () =>
          (original as MigrationCommand).apply(this ?? db, args)
        )
      );
    };
  }

  const originalCreate = db.create;
  if (typeof originalCreate === "function") {
    db.create = async function create(this: unknown, args: DbArgs) {
      const result = await (originalCreate as DbMethod).call(this ?? db, args);
      if (isMigrationRow(args)) {
        await recordMigration({ ...args.data, ...(result as MigrationRow) }, "up", args.req);
      }
      return result;
    };
  }

  const originalDeleteOne = db.deleteOne;
  if (typeof originalDeleteOne === "function") {
    db.deleteOne = async function deleteOne(this: unknown, args: DbArgs) {
      if (!isMigrationRow(args)) return (originalDeleteOne as DbMethod).call(this ?? db, args);
      const row = await readRowBeforeDelete(args);
      const result = await (originalDeleteOne as DbMethod).call(this ?? db, args);
      await recordMigration(row, "down", args.req);
      return result;
    };
  }
}
