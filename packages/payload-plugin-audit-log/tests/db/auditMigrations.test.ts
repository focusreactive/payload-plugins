import { describe, expect, it, vi } from "vitest";
import { getScopedAuditActor } from "../../src/core/actorScope";
import { auditMigrations } from "../../src/db/auditMigrations";
import { normalizeOptions } from "../../src/options";

type Call = { method: string; args: any };

const MIGRATION_COMMANDS = {
  migrate: "migrate",
  migrateDown: "migrate:down",
  migrateFresh: "migrate:fresh",
  migrateRefresh: "migrate:refresh",
  migrateReset: "migrate:reset",
} as const;

const fakeAdapter = (storedRows: Record<string, unknown>[] = []) => {
  const calls: Call[] = [];
  const actorsSeen: Record<string, unknown> = {};
  const db: Record<string | symbol, any> = {
    create: vi.fn(async (args: any) => {
      calls.push({ method: "create", args });
      return { id: 7, ...args.data };
    }),
    deleteOne: vi.fn(async (args: any) => {
      calls.push({ method: "deleteOne", args });
      return null;
    }),
    findOne: vi.fn(async (args: any) => {
      calls.push({ method: "findOne", args });
      return storedRows.shift() ?? null;
    }),
    migrateStatus: vi.fn(async () => {
      actorsSeen.migrateStatus = getScopedAuditActor();
    }),
  };
  for (const method of Object.keys(MIGRATION_COMMANDS)) {
    db[method] = vi.fn(async function (this: unknown) {
      actorsSeen[method] = { actor: getScopedAuditActor(), self: this };
    });
  }
  const payload = { db, logger: { error: vi.fn() }, collections: {} };
  return { db, calls, actorsSeen, payload: payload as never };
};

const auditWrites = (calls: Call[]) =>
  calls.filter((c) => c.method === "create" && c.args.collection === "audit-events");

describe("auditMigrations", () => {
  it("runs every migration command as a migration actor named after the CLI command", async () => {
    const f = fakeAdapter();
    auditMigrations(f.payload, normalizeOptions(), f.db);
    for (const [method, command] of Object.entries(MIGRATION_COMMANDS)) {
      await f.db[method]({ forceAcceptWarning: true });
      expect(f.actorsSeen[method]).toEqual({
        actor: { type: "migration", label: command },
        self: f.db,
      });
    }
    await f.db.migrateStatus();
    expect(f.actorsSeen.migrateStatus).toBeUndefined();
  });

  it("passes the arguments through to the original command", async () => {
    const f = fakeAdapter();
    const migrate = f.db.migrate;
    auditMigrations(f.payload, normalizeOptions(), f.db);
    const migrations = [{ name: "m1" }];
    await f.db.migrate({ migrations });
    expect(migrate).toHaveBeenCalledWith({ migrations });
  });

  it("records system.migration up when a migration row is created", async () => {
    const f = fakeAdapter();
    auditMigrations(f.payload, normalizeOptions(), f.db);
    const req = { context: {}, payloadAPI: "local", transactionID: undefined };
    const row = await f.db.create({
      collection: "payload-migrations",
      data: { name: "20260101_init", batch: 3 },
      req,
    });
    expect(row).toEqual({ id: 7, name: "20260101_init", batch: 3 });
    const [audit] = auditWrites(f.calls);
    expect(audit?.args.req).toBe(req);
    expect(audit?.args.data).toMatchObject({
      action: "system.migration",
      target: { kind: "system", slug: "payload-migrations", docId: "7", label: "20260101_init" },
      metadata: { name: "20260101_init", batch: 3, direction: "up" },
    });
  });

  it("records system.migration down with the row read before it is deleted", async () => {
    const f = fakeAdapter([{ id: 7, name: "20260101_init", batch: 3 }]);
    auditMigrations(f.payload, normalizeOptions(), f.db);
    const where = { id: { equals: 7 } };
    await f.db.deleteOne({ collection: "payload-migrations", where, req: { context: {} } });
    expect(f.calls.map((c) => c.method)).toEqual(["findOne", "deleteOne", "create"]);
    expect(f.calls[0]?.args).toMatchObject({ collection: "payload-migrations", where });
    expect(auditWrites(f.calls)[0]?.args.data.metadata).toEqual({
      name: "20260101_init",
      batch: 3,
      direction: "down",
    });
  });

  it("ignores the row Payload keeps for dev schema pushes and writes to other collections", async () => {
    const f = fakeAdapter([{ id: 1, name: "dev", batch: -1 }]);
    auditMigrations(f.payload, normalizeOptions(), f.db);
    await f.db.deleteOne({ collection: "payload-migrations", where: { batch: { equals: -1 } } });
    await f.db.create({ collection: "posts", data: { title: "x" } });
    await f.db.deleteOne({ collection: "posts", where: { id: { equals: 1 } } });
    expect(auditWrites(f.calls)).toHaveLength(0);
    expect(f.calls.filter((c) => c.method === "findOne")).toHaveLength(1);
  });

  it("deletes the row and logs the error when the row cannot be read first", async () => {
    const f = fakeAdapter();
    f.db.findOne.mockRejectedValueOnce(new Error("read failed"));
    auditMigrations(f.payload, normalizeOptions(), f.db);
    await f.db.deleteOne({ collection: "payload-migrations", where: { id: { equals: 7 } } });
    expect(f.calls.map((c) => c.method)).toEqual(["deleteOne"]);
    expect((f.payload as { logger: { error: unknown } }).logger.error).toHaveBeenCalled();
  });

  it("records migrations whatever trackUnattributedWrites is, and only once", async () => {
    const f = fakeAdapter();
    auditMigrations(f.payload, normalizeOptions({ trackUnattributedWrites: false }), f.db);
    auditMigrations(f.payload, normalizeOptions({ trackUnattributedWrites: false }), f.db);
    await f.db.create({ collection: "payload-migrations", data: { name: "m", batch: 1 } });
    expect(auditWrites(f.calls)).toHaveLength(1);
  });

  it("writes to the configured audit collection", async () => {
    const f = fakeAdapter();
    auditMigrations(f.payload, normalizeOptions({ slug: "journal" }), f.db);
    await f.db.create({ collection: "payload-migrations", data: { name: "m", batch: 1 } });
    expect(f.calls.at(-1)?.args.collection).toBe("journal");
  });

  it("reads the migration row being deleted inside a savepoint of the SQL transaction and still deletes when it fails", async () => {
    const f = fakeAdapter();
    const statements: string[] = [];
    f.db.findOne = vi.fn(async () => {
      statements.push("READ");
      throw new Error("current transaction is aborted");
    });
    f.db.sessions = { "tx-1": { db: { name: "tx" } } };
    f.db.execute = vi.fn(async ({ raw }: { raw: string }) => {
      statements.push(raw.split(" audit_")[0] as string);
    });
    auditMigrations(f.payload, normalizeOptions(), f.db);
    const where = { id: { equals: 7 } };
    await f.db.deleteOne({
      collection: "payload-migrations",
      where,
      req: { context: {}, transactionID: "tx-1" },
    });
    expect(statements).toEqual(["SAVEPOINT", "READ", "ROLLBACK TO SAVEPOINT", "RELEASE SAVEPOINT"]);
    expect(f.calls.map((c) => c.method)).toEqual(["deleteOne"]);
  });

  it("writes the events of each migration once it is recorded, before the next migration runs", async () => {
    const f = fakeAdapter();
    let auditWritesWhenSecondStarts = -1;
    f.db.migrate = vi.fn(async () => {
      await f.db.create({ collection: "payload-migrations", data: { name: "one", batch: 1 } });
      auditWritesWhenSecondStarts = auditWrites(f.calls).length;
      await f.db.create({ collection: "payload-migrations", data: { name: "two", batch: 1 } });
    });
    auditMigrations(f.payload, normalizeOptions(), f.db);
    await f.db.migrate();
    expect(auditWritesWhenSecondStarts).toBe(1);
    expect(auditWrites(f.calls).map((c) => c.args.data.metadata.name)).toEqual(["one", "two"]);
    expect(auditWrites(f.calls)[0]?.args.data.actor).toEqual({
      type: "migration",
      label: "migrate",
      source: "als",
    });
  });
});
