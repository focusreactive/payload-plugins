import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  events,
  timestampAfterEverythingSoFar,
  unattributedEvents,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const FOLDERS = "payload-folders";

const collections: CollectionConfig[] = [
  { slug: "filed-docs", folders: true, fields: [{ name: "title", type: "text" }] },
];

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections });
});
afterAll(async () => {
  await ctx?.cleanup();
});

type Folder = { id: string | number };

const createFolder = async (name: string, parent?: Folder) =>
  (await ctx.payload.create({
    collection: FOLDERS as never,
    data: { name, folderType: ["filed-docs"], ...(parent ? { folder: parent.id } : {}) } as never,
  })) as unknown as Folder;

const folderEventsSince = async (since: string) =>
  (
    await events(ctx.payload, {
      and: [{ "target.slug": { equals: FOLDERS } }, { occurredAt: { greater_than_equal: since } }],
    })
  ).map((event) => [event.action, event.target.docId, event.changes ?? null]);

describe("folders", () => {
  it("creating, renaming and deleting a folder is logged like any document", async () => {
    const since = await timestampAfterEverythingSoFar();

    const folder = await createFolder("Reports");
    await ctx.payload.update({
      collection: FOLDERS as never,
      id: folder.id,
      data: { name: "Archive" } as never,
    });
    await ctx.payload.delete({ collection: FOLDERS as never, id: folder.id });

    const id = String(folder.id);
    expect(await folderEventsSince(since)).toEqual([
      ["doc.create", id, ["name", "folderType"]],
      ["doc.update", id, ["name"]],
      ["doc.delete", id, null],
    ]);
    expect(await unattributedEvents(ctx.payload)).toEqual([]);
  });

  it("deleting a folder logs the subfolders Payload deletes with it", async () => {
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent);
    const since = await timestampAfterEverythingSoFar();

    await ctx.payload.delete({ collection: FOLDERS as never, id: parent.id });

    expect(await folderEventsSince(since)).toEqual([
      ["doc.delete", String(child.id), null],
      ["doc.delete", String(parent.id), null],
    ]);
  });
});
