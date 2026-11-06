import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Migration, Payload, PayloadRequest } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  eventsWithAction,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const MIGRATION_NAME = "20261105_120000_add_welcome_post";
const WELCOME_TITLE = "Welcome, added by a migration";

type MigrationArgs = { payload: Payload; req: PayloadRequest };

const addWelcomePost = async (args: unknown) => {
  const { payload, req } = args as MigrationArgs;
  await payload.create({
    collection: "posts" as never,
    data: { title: WELCOME_TITLE } as never,
    req,
  });
};

const removeWelcomePost = async (args: unknown) => {
  const { payload, req } = args as MigrationArgs;
  await payload.delete({
    collection: "posts" as never,
    where: { title: { equals: WELCOME_TITLE } },
    req,
  });
};

const MIGRATION_FILE_SOURCE = `
export async function up({ payload, req }) {
  await payload.create({ collection: "posts", data: { title: ${JSON.stringify(WELCOME_TITLE)} }, req });
}

export async function down({ payload, req }) {
  await payload.delete({
    collection: "posts",
    where: { title: { equals: ${JSON.stringify(WELCOME_TITLE)} } },
    req,
  });
}
`;

let ctx: AuditTestPayload;
let migrationDir: string;

const forgetDevSchemaPushes = () =>
  ctx.payload.delete({
    collection: "payload-migrations" as never,
    where: { batch: { equals: -1 } },
  });

const welcomePostIds = async () => {
  const { docs } = await ctx.payload.find({
    collection: "posts" as never,
    where: { title: { equals: WELCOME_TITLE } },
    trash: true,
  });
  return docs.map((doc) => doc.id);
};

beforeAll(async () => {
  ctx = await bootAuditPayload();
  migrationDir = mkdtempSync(join(tmpdir(), "audit-migrations-"));
  writeFileSync(join(migrationDir, `${MIGRATION_NAME}.js`), MIGRATION_FILE_SOURCE);
  ctx.payload.db.migrationDir = migrationDir;
  await forgetDevSchemaPushes();
});

afterAll(async () => {
  await ctx?.cleanup();
  rmSync(migrationDir, { recursive: true, force: true });
});

describe("migrations", () => {
  it("running a migration records system.migration up, and what it changed is done by the migration actor", async () => {
    const welcomePostMigration: Migration = {
      name: MIGRATION_NAME,
      up: addWelcomePost,
      down: removeWelcomePost,
    };
    await ctx.payload.db.migrate({ migrations: [welcomePostMigration] });

    const [migration] = await eventsWithAction(ctx.payload, "system.migration");
    expect(migration).toMatchObject({
      actor: { type: "migration", label: "migrate", source: "als" },
      target: { kind: "system", slug: "payload-migrations", label: MIGRATION_NAME },
      metadata: { name: MIGRATION_NAME, batch: 1, direction: "up" },
    });

    const [postId] = await welcomePostIds();
    const [created] = await targetEvents(ctx.payload, "posts", postId);
    expect(created).toMatchObject({
      action: "doc.create",
      actor: { type: "migration", label: "migrate", source: "als" },
      requestId: migration?.requestId,
    });
  });

  it("rolling it back records system.migration down, and the reverted change is done by the migration actor", async () => {
    const [postId] = await welcomePostIds();
    await ctx.payload.db.migrateDown();

    const down = (await eventsWithAction(ctx.payload, "system.migration")).filter(
      (event) => event.metadata?.direction === "down"
    );
    expect(down).toHaveLength(1);
    expect(down[0]).toMatchObject({
      actor: { type: "migration", label: "migrate:down" },
      metadata: { name: MIGRATION_NAME, batch: 1, direction: "down" },
    });

    const deleted = (await targetEvents(ctx.payload, "posts", postId)).at(-1);
    expect(deleted).toMatchObject({
      action: "doc.delete",
      actor: { type: "migration", label: "migrate:down" },
    });
    expect(await welcomePostIds()).toEqual([]);
  });

  it("nothing the migrations did is unattributed", async () => {
    expect(await eventsWithAction(ctx.payload, "system.unattributed_write")).toEqual([]);
  });

  it("a raw write in a migration on a document it updated through Payload just before is unattributed", async () => {
    const since = await timestampAfterEverythingSoFar();
    const post = await ctx.payload.create({
      collection: "posts" as never,
      data: { title: "Edited by a migration" } as never,
    });
    const editThenRawWrite: Migration = {
      name: "20261105_130000_edit_then_raw_write",
      up: async (args: unknown) => {
        const { payload, req } = args as MigrationArgs;
        await payload.update({
          collection: "posts" as never,
          id: post.id,
          data: { title: "Through Payload" } as never,
          req,
        });
        await payload.db.updateOne({
          collection: "posts",
          id: post.id,
          data: { title: "Raw" },
          req,
        });
      },
      down: async () => undefined,
    };
    await ctx.payload.db.migrate({ migrations: [editThenRawWrite] });

    const events = await targetEvents(ctx.payload, "posts", post.id, since);
    expect(events.map((event) => event.action)).toEqual([
      "doc.create",
      "doc.update",
      "system.unattributed_write",
    ]);
    expect(events.at(-1)).toMatchObject({
      actor: { type: "migration", label: "migrate" },
      changes: ["title"],
      metadata: { method: "updateOne" },
    });
  });

  it("writes the events of each migration as soon as it commits, before the next one runs", async () => {
    const seenBySecond: string[] = [];
    const first: Migration = {
      name: "20261105_140000_first",
      up: async (args: unknown) => {
        const { payload, req } = args as MigrationArgs;
        await payload.create({
          collection: "posts" as never,
          data: { title: "From the first" } as never,
          req,
        });
      },
      down: async () => undefined,
    };
    const second: Migration = {
      name: "20261105_140100_second",
      up: async () => {
        const recorded = await eventsWithAction(ctx.payload, "system.migration");
        seenBySecond.push(...recorded.map((event) => String(event.metadata?.name)));
      },
      down: async () => undefined,
    };
    await ctx.payload.db.migrate({ migrations: [first, second] });

    expect(seenBySecond).toContain(first.name);
    expect(seenBySecond).not.toContain(second.name);
    const names = (await eventsWithAction(ctx.payload, "system.migration")).map(
      (event) => event.metadata?.name
    );
    expect(names).toEqual(expect.arrayContaining([first.name, second.name]));
  });
});
