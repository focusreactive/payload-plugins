import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { deleteItems, duplicateItems, publishItems } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  // Three documents run at once; a folder with four pages is more, so a user-driven call is stepped.
  harness = await getTestPayload({ foldersOptions: { limits: { maxSyncDocuments: 3 } } });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const seedFolderWithDraftPages = async (payload: Payload, slug: string) => {
  const folder = await createFolder(payload, { slug });
  for (let index = 1; index <= 4; index += 1) {
    await payload.create({
      collection: "pages",
      data: {
        _status: "draft",
        folder: folder.id,
        slug: `${slug}-${index}`,
        title: `${slug}-${index}`,
      } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
  }

  return folder;
};

const countAll = async (payload: Payload, collection: "folders" | "pages") =>
  (await payload.db.count({ collection, where: { id: { exists: true } } })).totalDocs;

describe("a call with no user, above limits.maxSyncDocuments", () => {
  it("deletes at once, because nobody could step a queued operation", async () => {
    const { payload } = harness;
    const folder = await seedFolderWithDraftPages(payload, "doomed");

    const result = await deleteItems(payload, {
      items: [{ collection: "folders", id: folder.id }],
      overrideAccess: true,
    });

    expect(result).toEqual({ deleted: 5, trashed: 0 });
    expect(await countAll(payload, "folders")).toBe(0);
    expect(await countAll(payload, "pages")).toBe(0);
  });

  it("publishes at once", async () => {
    const { payload } = harness;
    const folder = await seedFolderWithDraftPages(payload, "launch");

    const result = await publishItems(payload, {
      action: "publish",
      items: [{ collection: "folders", id: folder.id }],
      overrideAccess: true,
    });

    expect(result).toMatchObject({ updated: 4 });
    const published = await payload.count({
      collection: "pages",
      overrideAccess: true,
      where: { _status: { equals: "published" } },
    });
    expect(published.totalDocs).toBe(4);
  });

  it("duplicates at once", async () => {
    const { payload } = harness;
    const folder = await seedFolderWithDraftPages(payload, "source");

    const result = await duplicateItems(payload, {
      items: [{ collection: "folders", id: folder.id }],
      overrideAccess: true,
    });

    expect(result).toMatchObject({ copied: 5 });
    expect(await countAll(payload, "folders")).toBe(2);
    expect(await countAll(payload, "pages")).toBe(8);
  });
});
