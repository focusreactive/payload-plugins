import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const readTreeRevision = async (payload: Payload): Promise<number> =>
  (
    (await payload.db.findGlobal({ slug: "folders-tree-state" as never })) as {
      revision?: number | null;
    }
  ).revision ?? 0;

const publishedPage = (payload: Payload, data: { folder: number; slug: string }) =>
  payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: data.folder,
      isFolderRoot: false,
      slug: data.slug,
      title: data.slug,
    } as never,
    depth: 0,
    overrideAccess: true,
  });

// Other editors' trees learn of a change by polling the revision, so every save that changes what
// the tree shows of a live page has to move it (the tree shows paths and root flags from the live row).
describe("the tree revision after a page save", () => {
  it("goes up when a published page becomes the root page of its folder", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "intro" });
    const before = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readTreeRevision(payload)).toBeGreaterThan(before);
  });

  it("goes up when a published page changes its slug", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "intro" });
    const before = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "start-here" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });

    expect(await readTreeRevision(payload)).toBeGreaterThan(before);
  });

  it("goes up when a draft is published and when a page is unpublished", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await payload.create({
      collection: "pages",
      data: { _status: "draft", folder: folder.id, slug: "later", title: "later" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    const beforePublish = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    const afterPublish = await readTreeRevision(payload);
    await payload.update({
      collection: "pages",
      data: { _status: "draft" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(afterPublish).toBeGreaterThan(beforePublish);
    expect(await readTreeRevision(payload)).toBeGreaterThan(afterPublish);
  });

  it("stays where it was after a title-only draft save over a published page", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "intro" });
    const before = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "draft", title: "Intro, next version" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readTreeRevision(payload)).toBe(before);
  });

  it("stays where it was after a draft save that only sets the root flag", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "intro" });
    const before = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "draft", isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readTreeRevision(payload)).toBe(before);
  });

  it("stays where it was after a published title edit that moves no path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "intro" });
    const before = await readTreeRevision(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Intro, retitled" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readTreeRevision(payload)).toBe(before);
  });
});
