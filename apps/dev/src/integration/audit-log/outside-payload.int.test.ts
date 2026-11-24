import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalReq } from "payload";
import type { Migration, Payload, PayloadRequest } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootAuditPayload, events, targetEvents } from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const MIGRATION_NAME = "20261105_120000_add_welcome_post";
const WELCOME_TITLE = "Welcome, added by a migration";

type MigrationArgs = { payload: Payload; req: PayloadRequest };

const welcomePostMigration: Migration = {
  name: MIGRATION_NAME,
  up: async (args: unknown) => {
    const { payload, req } = args as MigrationArgs;
    await payload.create({
      collection: "posts" as never,
      data: { title: WELCOME_TITLE } as never,
      req,
    });
  },
  down: async (args: unknown) => {
    const { payload, req } = args as MigrationArgs;
    await payload.delete({
      collection: "posts" as never,
      where: { title: { equals: WELCOME_TITLE } },
      req,
    });
  },
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

beforeAll(async () => {
  ctx = await bootAuditPayload();
  migrationDir = mkdtempSync(join(tmpdir(), "audit-migrations-"));
  writeFileSync(join(migrationDir, `${MIGRATION_NAME}.js`), MIGRATION_FILE_SOURCE);
  ctx.payload.db.migrationDir = migrationDir;
  await ctx.payload.delete({
    collection: "payload-migrations" as never,
    where: { batch: { equals: -1 } },
  });
});

afterAll(async () => {
  await ctx?.cleanup();
  rmSync(migrationDir, { recursive: true, force: true });
});

const eventCount = async () => (await events(ctx.payload)).length;

const newEventsDuring = async (run: () => Promise<unknown>) => {
  const before = await eventCount();
  await run();
  return (await events(ctx.payload)).slice(before);
};

const welcomePostId = async () => {
  const { docs } = await ctx.payload.find({
    collection: "posts" as never,
    where: { title: { equals: WELCOME_TITLE } },
    trash: true,
  });
  return docs[0]?.id;
};

describe("writes that do not go through Payload's operations", () => {
  it("records nothing for database adapter calls, with or without a req", async () => {
    const post = await ctx.payload.create({
      collection: "posts" as never,
      data: { title: "Raw target" } as never,
    });
    const req = await createLocalReq({}, ctx.payload);
    const recorded = await newEventsDuring(async () => {
      await ctx.payload.db.updateOne({
        collection: "posts",
        id: post.id,
        data: { title: "Raw" },
      });
      await ctx.payload.db.updateOne({
        collection: "posts",
        id: post.id,
        data: { title: "Raw with req" },
        req,
      });
      await ctx.payload.db.create({ collection: "posts", data: { title: "Raw create" }, req });
      await ctx.payload.db.updateGlobal({ slug: "settings", data: { siteName: "Raw" }, req });
      await ctx.payload.db.deleteOne({
        collection: "posts",
        where: { id: { equals: post.id } },
        req,
      });
    });
    expect(recorded).toEqual([]);
  });
});

describe("migrations", () => {
  it("records no event for running a migration, and what it writes through the Local API as the system actor", async () => {
    const recorded = await newEventsDuring(() =>
      ctx.payload.db.migrate({ migrations: [welcomePostMigration] })
    );
    const postId = await welcomePostId();
    expect(recorded.map((event) => [event.action, event.target.slug])).toEqual([
      ["doc.create", "posts"],
    ]);
    const [created] = await targetEvents(ctx.payload, "posts", postId);
    expect(created).toMatchObject({
      action: "doc.create",
      actor: { type: "system", source: "inferred" },
      via: "local",
      ip: null,
      userAgent: null,
    });
  });

  it("records no event for rolling a migration back, and the delete it makes through the Local API as the system actor", async () => {
    const postId = await welcomePostId();
    const recorded = await newEventsDuring(() => ctx.payload.db.migrateDown());
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      action: "doc.delete",
      actor: { type: "system", source: "inferred" },
      target: { slug: "posts", docId: String(postId) },
    });
  });
});
