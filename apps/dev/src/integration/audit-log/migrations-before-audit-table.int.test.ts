import type { Migration, Payload, PayloadRequest } from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import {
  bootAuditPayload,
  dbAdapterName,
  eventsWithAction,
  hideAuditTable,
  restoreAuditTable,
  targetEvents,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

type MigrationArgs = { payload: Payload; req: PayloadRequest; db?: unknown };

const hasAuditTable = dbAdapterName() !== "mongo";

const createPostMigration = (name: string, title: string): Migration => ({
  name,
  up: async (args: unknown) => {
    const { payload, req } = args as MigrationArgs;
    await payload.create({ collection: "posts" as never, data: { title } as never, req });
  },
  down: async () => undefined,
});

const createAuditTableMigration = (name: string): Migration => ({
  name,
  up: async (args: unknown) => {
    const { payload, db } = args as MigrationArgs;
    if (hasAuditTable) await restoreAuditTable(payload, db);
  },
  down: async () => undefined,
});

const MIGRATED_POST_TITLES = ["Before the audit table 1", "Before the audit table 2", "After it"];

const BEFORE_AUDIT_TABLE = [
  createPostMigration("20261105_100000_first_post", "Before the audit table 1"),
  createPostMigration("20261105_100100_second_post", "Before the audit table 2"),
];
const AUDIT_TABLE = createAuditTableMigration("20261105_100200_add_audit_log");
const AFTER_AUDIT_TABLE = createPostMigration("20261105_100300_third_post", "After it");
const WITHOUT_AUDIT_TABLE = createPostMigration(
  "20261105_100400_while_audit_table_missing",
  "Migrated while the audit table is missing"
);

let ctx: AuditTestPayload;
let errorLog: MockInstance;
let warnLog: MockInstance;

const postIdTitled = async (title: string) => {
  const { docs } = await ctx.payload.find({
    collection: "posts" as never,
    where: { title: { equals: title } },
  });
  return docs[0]?.id;
};

beforeAll(async () => {
  ctx = await bootAuditPayload();
  await ctx.payload.delete({
    collection: "payload-migrations" as never,
    where: { batch: { equals: -1 } },
  });
});

afterAll(async () => {
  await ctx?.cleanup();
});

beforeEach(() => {
  errorLog = vi.spyOn(ctx.payload.logger, "error");
  warnLog = vi.spyOn(ctx.payload.logger, "warn");
});

describe("the first migrate, on a database whose audit table a later migration creates", () => {
  it("logs no error and records every migration of the command, including those before the audit table", async () => {
    if (hasAuditTable) await hideAuditTable(ctx.payload);
    await ctx.payload.db.migrate({
      migrations: [...BEFORE_AUDIT_TABLE, AUDIT_TABLE, AFTER_AUDIT_TABLE],
    });

    expect(errorLog).not.toHaveBeenCalled();
    expect(warnLog).not.toHaveBeenCalled();

    const migrations = await eventsWithAction(ctx.payload, "system.migration");
    expect(migrations.map((event) => [event.metadata?.name, event.actor?.label])).toEqual([
      ["20261105_100000_first_post", "migrate"],
      ["20261105_100100_second_post", "migrate"],
      ["20261105_100200_add_audit_log", "migrate"],
      ["20261105_100300_third_post", "migrate"],
    ]);

    for (const title of MIGRATED_POST_TITLES) {
      const [created] = await targetEvents(ctx.payload, "posts", await postIdTitled(title));
      expect(created).toMatchObject({
        action: "doc.create",
        actor: { type: "migration", label: "migrate" },
      });
    }
  });

  it.skipIf(!hasAuditTable)(
    "warns once, without an error or a stack, when the audit table still does not exist after the command",
    async () => {
      await hideAuditTable(ctx.payload);
      try {
        await ctx.payload.db.migrate({ migrations: [WITHOUT_AUDIT_TABLE] });
      } finally {
        await restoreAuditTable(ctx.payload);
      }

      expect(errorLog).not.toHaveBeenCalled();
      expect(warnLog).toHaveBeenCalledTimes(1);
      const [message] = warnLog.mock.calls[0] as [unknown];
      expect(message).toMatch(
        /^\[payload-plugin-audit-log\] 2 audit event\(s\) recorded during the command could not be written: /u
      );
      expect(String(message)).not.toContain("\n    at ");
      const migrations = await eventsWithAction(ctx.payload, "system.migration");
      expect(migrations.map((event) => event.metadata?.name)).not.toContain(
        WITHOUT_AUDIT_TABLE.name
      );
    }
  );
});
