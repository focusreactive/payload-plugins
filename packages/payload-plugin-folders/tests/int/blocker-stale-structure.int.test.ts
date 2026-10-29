import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { patchLatestVersionStructure } from "../../src/core/structureWrite.js";
import { moveItems } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createTestRequest } from "../helpers/treeFixtures.js";

/**
 * Blocker 1 (spec section 5.3): a write built from data that is older than a move must never undo
 * the move. Every case below is a different way old data reaches a page: a REST client, an
 * autosave, a publish, a scheduled publish, a version restore, a publish after a rebalance.
 */

type Structure = { folder: number | null; orderKey: string | null; structureRevision: number };

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

const pageRef = (id: number) => ({ collection: "pages", id });

const pickStructure = (document: Structure): Structure => ({
  folder: document.folder,
  orderKey: document.orderKey,
  structureRevision: document.structureRevision,
});

const createPublishedPage = async (
  payload: Payload,
  data: { folder: number | null; slug: string; title: string }
): Promise<{ id: number } & Structure> =>
  (await payload.create({
    collection: "pages",
    data: { _status: "published", ...data } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { id: number } & Structure;

const saveDraft = async (payload: Payload, id: number, title: string): Promise<void> => {
  await payload.update({
    collection: "pages",
    data: { title } as never,
    depth: 0,
    draft: true,
    id,
    overrideAccess: true,
  });
};

const readMain = async (payload: Payload, id: number): Promise<Structure & { title: string }> =>
  (await payload.findByID({
    collection: "pages",
    depth: 0,
    draft: false,
    id,
    overrideAccess: true,
  })) as unknown as Structure & { title: string };

const readDraft = async (payload: Payload, id: number): Promise<Structure & { title: string }> =>
  (await payload.findByID({
    collection: "pages",
    depth: 0,
    draft: true,
    id,
    overrideAccess: true,
  })) as unknown as Structure & { title: string };

const readLatestVersionStructure = async (payload: Payload, id: number): Promise<Structure> => {
  const { docs } = await payload.findVersions({
    collection: "pages",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  });

  return pickStructure(docs[0].version as unknown as Structure);
};

/** What the tree says now: the main row, the newest draft and the latest version agree. */
const expectStructureEverywhere = async (
  payload: Payload,
  id: number,
  expected: Structure
): Promise<void> => {
  expect(pickStructure(await readMain(payload, id))).toEqual(expected);
  expect(pickStructure(await readDraft(payload, id))).toEqual(expected);
  expect(await readLatestVersionStructure(payload, id)).toEqual(expected);
};

/** A published page in `source`, moved to `target`: the data an old form still holds, and the new truth. */
const movePublishedPage = async (slug: string) => {
  const { payload } = harness;
  const source = await createFolder(payload, { slug: `source-${slug}` });
  const target = await createFolder(payload, { slug: `target-${slug}` });
  const page = await createPublishedPage(payload, { folder: source.id, slug, title: "Original" });
  const staleForm = pickStructure(await readDraft(payload, page.id));
  expect(staleForm.folder).toBe(source.id);

  await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });
  const moved = pickStructure(await readMain(payload, page.id));
  expect(moved.folder).toBe(target.id);
  expect(moved.structureRevision).toBeGreaterThan(staleForm.structureRevision);

  return { moved, page, source, staleForm, target };
};

describe("stale structure cannot undo a move", () => {
  it("a REST PATCH carrying the old folder after a move keeps the new folder", async () => {
    const { payload } = harness;
    const { moved, page, staleForm } = await movePublishedPage("rest-patch");

    const result = await callEndpoint({
      body: { ...staleForm, title: "Edited over REST" },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}`,
      payload,
    });

    expect(result.status).toBe(200);
    expect(await readMain(payload, page.id)).toMatchObject({ ...moved, title: "Edited over REST" });
    expect(await readLatestVersionStructure(payload, page.id)).toEqual(moved);
  });

  it("an autosave of a form loaded before the move keeps the new folder", async () => {
    const { payload } = harness;
    const { moved, page, staleForm } = await movePublishedPage("autosave");

    // The Local API skips field access, so the guard itself has to replace the old values.
    await payload.update({
      autosave: true,
      collection: "pages",
      data: { ...staleForm, title: "Autosaved locally" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });
    await expectStructureEverywhere(payload, page.id, moved);
    expect((await readDraft(payload, page.id)).title).toBe("Autosaved locally");

    const result = await callEndpoint({
      body: { ...staleForm, title: "Autosaved over REST" },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?draft=true&autosave=true`,
      payload,
    });
    expect(result.status).toBe(200);
    await expectStructureEverywhere(payload, page.id, moved);
    expect((await readDraft(payload, page.id)).title).toBe("Autosaved over REST");
    // The autosave never published anything: the main row keeps the published title.
    expect((await readMain(payload, page.id)).title).toBe("Original");
  });

  it("publishing a draft created before the move keeps the new folder", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-publish" });
    const target = await createFolder(payload, { slug: "target-publish" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "publish-me",
      title: "Original",
    });
    await saveDraft(payload, page.id, "Pending draft");
    const draftBeforeMove = await readDraft(payload, page.id);
    expect(draftBeforeMove.folder).toBe(source.id);

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });
    await payload.update({
      collection: "pages",
      data: { _status: "published" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    const published = await readMain(payload, page.id);
    expect(published.title).toBe("Pending draft");
    expect(published.folder).toBe(target.id);
    expect(published.structureRevision).toBeGreaterThan(draftBeforeMove.structureRevision);
    await expectStructureEverywhere(payload, page.id, pickStructure(published));
  });

  it("a scheduled publish of an old draft keeps the new folder (the dev config has no schedulePublish, so this runs the update the job runs)", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-scheduled" });
    const target = await createFolder(payload, { slug: "target-scheduled" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "scheduled",
      title: "Original",
    });
    await saveDraft(payload, page.id, "Scheduled draft");
    // The job publishes every locale, and the dev page collection requires a title in each.
    await payload.update({
      collection: "pages",
      data: { title: "Geplanter Entwurf" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });

    // The schedulePublish job runs exactly this update (payload/src/versions/schedule/job.ts).
    await payload.update({
      collection: "pages",
      data: { _status: "published" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
      publishAllLocales: true,
      req: await createTestRequest(payload),
    });

    const published = await readMain(payload, page.id);
    expect(published.title).toBe("Scheduled draft");
    expect(published.folder).toBe(target.id);
    await expectStructureEverywhere(payload, page.id, pickStructure(published));
    const fullPath = (
      (await payload.findByID({
        collection: "pages",
        depth: 0,
        id: page.id,
        overrideAccess: true,
      })) as unknown as { fullPath: string }
    ).fullPath;
    expect(fullPath).toBe("/target-scheduled/scheduled");
  });

  it("restoring a version from before the move keeps the new folder", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-restore" });
    const target = await createFolder(payload, { slug: "target-restore" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "restore-me",
      title: "First",
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Second" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    const { docs: olderVersions } = await payload.findVersions({
      collection: "pages",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ parent: { equals: page.id } }, { latest: { equals: false } }] },
    });
    const olderVersion = olderVersions[0];
    expect((olderVersion.version as unknown as Structure).folder).toBe(source.id);

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });
    const moved = pickStructure(await readMain(payload, page.id));

    // The Local API restore skips access, so the guard sees the old folder itself.
    await payload.restoreVersion({
      collection: "pages",
      depth: 0,
      id: olderVersion.id,
      overrideAccess: true,
    });
    await expectStructureEverywhere(payload, page.id, moved);
    expect((await readMain(payload, page.id)).title).toBe("First");

    // The admin's Restore button, which goes through REST with field access applied.
    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Third" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    const result = await callEndpoint({
      config: harness.config,
      method: "POST",
      path: `/pages/versions/${olderVersion.id}`,
      payload,
    });
    expect(result.status).toBe(200);
    await expectStructureEverywhere(payload, page.id, moved);
    expect((await readMain(payload, page.id)).title).toBe("First");
  });

  it("a rebalance followed by publishing a sibling's old draft keeps the rebalanced order", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "rebalance" });
    const first = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "first",
      title: "First",
    });
    const second = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "second",
      title: "Second",
    });
    const outsider = await createPublishedPage(payload, {
      folder: null,
      slug: "outsider",
      title: "Outsider",
    });
    // Two equal neighbour keys cannot take an insert between them, so the move below rebalances.
    const request = await createTestRequest(payload);
    for (const id of [first.id, second.id]) {
      const updatedAt = new Date().toISOString();
      await payload.db.updateOne({
        collection: "pages",
        data: { orderKey: "a5", updatedAt },
        id,
        returning: false,
      });
      await patchLatestVersionStructure(request, "pages", id, { orderKey: "a5" }, updatedAt);
    }
    await saveDraft(payload, second.id, "Second, pending draft");
    // The form the editor opened before the rebalance.
    const staleForm = pickStructure(await readDraft(payload, second.id));
    expect(staleForm.orderKey).toBe("a5");

    await moveItems(payload, { after: pageRef(first.id), items: [pageRef(outsider.id)] });
    const rebalanced = pickStructure(await readMain(payload, second.id));
    expect(rebalanced.orderKey).not.toBe("a5");
    expect(rebalanced.structureRevision).toBeGreaterThan(staleForm.structureRevision);

    await payload.update({
      collection: "pages",
      data: { ...staleForm, _status: "published", title: "Second, pending draft" } as never,
      depth: 0,
      id: second.id,
      overrideAccess: true,
    });

    expect(pickStructure(await readMain(payload, second.id))).toEqual(rebalanced);
    expect(await readLatestVersionStructure(payload, second.id)).toEqual(rebalanced);
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      sort: "orderKey",
      where: { folder: { equals: folder.id } },
    });
    expect(docs.map((doc) => doc.id)).toContain(first.id);
    const keys = docs.map((doc) => doc.orderKey as string);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("a publish of an old draft leaves the page's structureRevision at the moved value", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-revision" });
    const middle = await createFolder(payload, { slug: "middle-revision" });
    const target = await createFolder(payload, { slug: "target-revision" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "revision",
      title: "Original",
    });
    await saveDraft(payload, page.id, "Old draft");
    const staleForm = pickStructure(await readDraft(payload, page.id));

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: middle.id });
    const result = await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });
    const movedRevision = result.structureRevisions[`pages:${page.id}`];
    expect(movedRevision).toBe(staleForm.structureRevision + 2);

    await payload.update({
      collection: "pages",
      data: { ...staleForm, _status: "published", title: "Old draft" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect((await readMain(payload, page.id)).structureRevision).toBe(movedRevision);
    expect((await readLatestVersionStructure(payload, page.id)).structureRevision).toBe(
      movedRevision
    );
    expect((await readMain(payload, page.id)).folder).toBe(target.id);
  });
});
