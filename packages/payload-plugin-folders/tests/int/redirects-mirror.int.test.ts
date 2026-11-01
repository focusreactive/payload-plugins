import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { OperationProgress } from "../../src/core/operations.js";
import { deleteItems, moveItems, repairTree } from "../../src/server/index.js";
import { callEndpoint, testUser } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

// A second app whose redirects plugin knows only `pages`: posts get custom rows there.
let harness: TestPayload;
let pagesOnlyHarness: TestPayload;
let pagesTrashHarness: TestPayload;
// A mirror whose limit is one row, so any change of two or more rows is above it.
let smallLimitHarness: TestPayload;

beforeAll(async () => {
  const mirror = { redirects: { mirrorToRedirectsPlugin: true } };
  harness = await getTestPayload({ foldersOptions: mirror });
  pagesOnlyHarness = await getTestPayload({
    foldersOptions: mirror,
    redirectsCollections: ["pages"],
  });
  pagesTrashHarness = await getTestPayload({ foldersOptions: mirror, trash: "pagesOnly" });
  smallLimitHarness = await getTestPayload({
    foldersOptions: { ...mirror, limits: { maxSyncDocuments: 1 } },
  });
});

afterAll(async () => {
  await harness?.destroy();
  await pagesOnlyHarness?.destroy();
  await pagesTrashHarness?.destroy();
  await smallLimitHarness?.destroy();
});

const forgetRows = async (payload: Payload): Promise<void> => {
  for (const collection of ["redirects", "folder-redirects", "folder-operations"] as const) {
    await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
};

afterEach(async () => {
  for (const { payload } of [harness, pagesOnlyHarness, pagesTrashHarness, smallLimitHarness]) {
    await forgetRows(payload);
    await clearTree(payload);
  }
});

type MirrorRow = {
  from: string;
  id: number;
  to: {
    reference?: { relationTo: string; value: number } | null;
    type: string;
    url?: string | null;
  };
};

const readMirrorRows = async (payload: Payload): Promise<MirrorRow[]> => {
  const { docs } = await payload.find({
    collection: "redirects",
    depth: 0,
    overrideAccess: true,
    pagination: false,
    sort: "from",
  });

  return docs as unknown as MirrorRow[];
};

const rowFrom = async (payload: Payload, from: string): Promise<MirrorRow | undefined> =>
  (await readMirrorRows(payload)).find((row) => row.from === from);

const pageRef = (id: number) => ({ collection: "pages", id });

describe("the plugin-redirects mirror", () => {
  it("a page move writes a reference row", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });

    const row = await rowFrom(payload, "/about/contact");
    expect(row?.to).toMatchObject({
      reference: { relationTo: "pages", value: tree.pages.contact.id },
      type: "reference",
    });
  });

  it("a posts move writes a custom row when posts is not in the redirects plugin", async () => {
    const { payload } = pagesOnlyHarness;
    const tree = await seedTree(payload);

    await moveItems(payload, {
      items: [{ collection: "posts", id: tree.pages.timeline.id }],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });

    const row = await rowFrom(payload, "/about/history/timeline");
    expect(row?.to).toMatchObject({ type: "custom", url: "/blog/timeline" });
    expect(row?.to.reference ?? null).toBeNull();
  });

  it("a de change writes a /de-prefixed from", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    // Only the de path changes: the page has no de segment of its own and the folder gets one.
    await payload.update({
      collection: "folders",
      data: { name: "Ueber uns", slug: "ueber-uns" },
      depth: 0,
      id: tree.about.id,
      locale: "de",
      overrideAccess: true,
    });

    const froms = (await readMirrorRows(payload)).map((row) => row.from);
    expect(froms).toContain("/de/about/contact");
    expect(froms).toContain("/de/about");
    expect(froms.filter((from) => !from.startsWith("/de/") && from !== "/de")).toEqual([]);
    const row = await rowFrom(payload, "/de/about/contact");
    expect(row?.to).toMatchObject({
      reference: { relationTo: "pages", value: tree.pages.contact.id },
      type: "reference",
    });
  });

  it("a row whose from is now a live page is deleted", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });
    expect(await rowFrom(payload, "/about/contact")).toBeDefined();
    expect(await rowFrom(payload, "/de/about/contact")).toBeDefined();

    // A new page takes the old URL, in every locale it is live in.
    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: tree.about.id, slug: "contact", title: "New contact" },
      depth: 0,
      overrideAccess: true,
    });

    expect(await rowFrom(payload, "/about/contact")).toBeUndefined();
    expect(await rowFrom(payload, "/de/about/contact")).toBeUndefined();
  });

  it("a page that takes a path another page just left removes that page's row", async () => {
    const { payload } = harness;
    const left = await createFolder(payload, { slug: "left" });
    const right = await createFolder(payload, { slug: "right" });
    const first = await payload.create({
      collection: "pages",
      data: { _status: "published", folder: left.id, slug: "same", title: "First" },
      depth: 0,
      overrideAccess: true,
    });
    const second = await payload.create({
      collection: "pages",
      data: { _status: "published", folder: right.id, slug: "other", title: "Second" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { slug: "renamed" } as never,
      depth: 0,
      id: first.id,
      overrideAccess: true,
    });
    expect(await rowFrom(payload, "/left/same")).toBeDefined();

    // The second page moves in and takes the first page's old URL.
    await moveItems(payload, {
      items: [pageRef(second.id)],
      overrideAccess: true,
      toFolder: left.id,
    });
    await payload.update({
      collection: "pages",
      data: { slug: "same" } as never,
      depth: 0,
      id: second.id,
      overrideAccess: true,
    });

    expect(await rowFrom(payload, "/left/same")).toBeUndefined();
    expect(await rowFrom(payload, "/right/other")).toMatchObject({
      to: { reference: { value: second.id } },
    });
  });

  it("redirects: false writes no row", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      overrideAccess: true,
      redirects: false,
      toFolder: tree.blog.id,
    });

    expect(await readMirrorRows(payload)).toEqual([]);
  });

  it("a folder rename writes a row per page", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    await payload.update({
      collection: "folders",
      data: { slug: "company" },
      depth: 0,
      id: tree.about.id,
      overrideAccess: true,
    });

    const froms = (await readMirrorRows(payload)).map((row) => row.from);
    // The root page and the contact page are live in en and, through fallback, in de.
    expect(froms).toEqual(
      expect.arrayContaining([
        "/about",
        "/about/contact",
        "/about/history/timeline",
        "/de/about",
        "/de/about/contact",
        "/de/about/history/timeline",
      ])
    );
    // The draft page under team is not a URL anyone visited.
    expect(froms.some((from) => from.includes("/team/"))).toBe(false);
  });

  it("the preview counts the mirror rows", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { planMove } = await import("../../src/server/index.js");
    const { createPayloadRequest } = await import("payload");
    const preview = await planMove(
      await createPayloadRequest({ payload, req: {} }),
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      { overrideAccess: true }
    );

    expect(preview.mirrorRowsToWrite).toBe(2);
    const withoutRedirects = await planMove(
      await createPayloadRequest({ payload, req: {} }),
      { items: [pageRef(tree.pages.contact.id)], redirects: false, toFolder: tree.blog.id },
      { overrideAccess: true }
    );
    expect(withoutRedirects.mirrorRowsToWrite).toBe(0);
  });

  it("repair writes a row for the URL it lowercases", async () => {
    const { payload } = harness;
    // A post as it was stored before the plugin: a capital in its segment, written below the hooks.
    const post = (await payload.db.create({
      collection: "posts",
      data: {
        createdAt: "2026-01-01T00:00:00.000Z",
        folder: null,
        isFolderRoot: false,
        orderKey: "a0",
        pathSegment: "About",
        slug: "About",
        structureRevision: 0,
        title: "About",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })) as unknown as { id: number };

    await repairTree(payload);

    const row = await rowFrom(payload, "/About");
    expect(row?.to).toMatchObject({ reference: { relationTo: "posts", value: post.id } });
  });
});

describe("deleting a page with a mirror row", () => {
  it("a delete removes the rows that reference the page and keeps the others", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id), pageRef(tree.pages["about-us"].id)],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });
    expect(await rowFrom(payload, "/about/contact")).toBeDefined();

    await payload.delete({
      collection: "pages",
      id: tree.pages.contact.id,
      overrideAccess: true,
    });

    // The database drops the reference with the page, so a row left behind would have none.
    expect(await rowFrom(payload, "/about/contact")).toBeUndefined();
    expect(await rowFrom(payload, "/de/about/contact")).toBeUndefined();
    expect((await rowFrom(payload, "/about"))?.to.reference?.value).toBe(tree.pages["about-us"].id);
  });

  it("a trashed page's rows go, and a permanent delete clears a row written for it since", async () => {
    const { payload } = pagesTrashHarness;
    const tree = await seedTree(payload);
    await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });
    expect(await rowFrom(payload, "/about/contact")).toBeDefined();

    await payload.update({
      collection: "pages",
      data: { deletedAt: new Date().toISOString() } as never,
      depth: 0,
      id: tree.pages.contact.id,
      overrideAccess: true,
    });
    expect(await readMirrorRows(payload)).toEqual([]);

    // A row an older run left behind for the trashed page, as data that predates the cleanup.
    await payload.create({
      collection: "redirects",
      data: {
        from: "/stale/contact",
        to: {
          reference: { relationTo: "pages", value: tree.pages.contact.id },
          type: "reference",
        },
      } as never,
      overrideAccess: true,
    });
    // Folders have no trash here, so this delete is permanent and takes the trashed page with it.
    await deleteItems(payload, {
      items: [{ collection: "folders", id: tree.blog.id }],
      overrideAccess: true,
    });

    expect(
      (
        await payload.count({
          collection: "pages",
          overrideAccess: true,
          trash: true,
          where: { id: { equals: tree.pages.contact.id } },
        })
      ).totalDocs
    ).toBe(0);
    expect(await readMirrorRows(payload)).toEqual([]);
  });
});

const findMirrorOperation = async (payload: Payload) =>
  (await payload.db.find({
    collection: "folder-operations" as never,
    where: { kind: { equals: "mirrorRedirects" } },
  })) as { docs: Array<{ done: number; id: number; status: string; total: number }> };

describe("a change with no user above the limit", () => {
  it("moveItems writes every row at once and answers no operation", async () => {
    const { payload } = smallLimitHarness;
    const tree = await seedTree(payload);

    const result = await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      overrideAccess: true,
      toFolder: tree.blog.id,
    });

    // The page is live in en and, through fallback, in de: two rows above a limit of one.
    expect(result.mirrorOperationId).toBeUndefined();
    expect((await readMirrorRows(payload)).map((row) => row.from).toSorted()).toEqual([
      "/about/contact",
      "/de/about/contact",
    ]);
    expect((await findMirrorOperation(payload)).docs).toEqual([]);
  });

  it("repairTree writes every row at once", async () => {
    const { payload } = smallLimitHarness;
    for (const segment of ["About", "Team"]) {
      await payload.db.create({
        collection: "posts",
        data: {
          createdAt: "2026-01-01T00:00:00.000Z",
          folder: null,
          isFolderRoot: false,
          orderKey: segment === "About" ? "a0" : "a1",
          pathSegment: segment,
          slug: segment,
          structureRevision: 0,
          title: segment,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      });
    }

    await repairTree(payload);

    expect((await readMirrorRows(payload)).map((row) => row.from).toSorted()).toEqual([
      "/About",
      "/Team",
      "/de/About",
      "/de/Team",
    ]);
    expect((await findMirrorOperation(payload)).docs).toEqual([]);
  });

  it("a change made by a user still queues an operation", async () => {
    const { payload } = smallLimitHarness;
    const tree = await seedTree(payload);

    const renamed = await callEndpoint({
      config: smallLimitHarness.config,
      body: { slug: "company" },
      method: "PATCH",
      path: `/folders/${tree.about.id}`,
      payload,
      payloadInstanceCacheKey: smallLimitHarness.cacheKey,
    });

    expect(renamed.status).toBe(200);
    expect((await findMirrorOperation(payload)).docs).toHaveLength(1);
  });
});

describe("a queued batch the site outran", () => {
  const renameAbout = (instance: TestPayload, folderId: number) =>
    callEndpoint({
      body: { slug: "company" },
      config: instance.config,
      method: "PATCH",
      path: `/folders/${folderId}`,
      payload: instance.payload,
      payloadInstanceCacheKey: instance.cacheKey,
    });

  const stepAll = async (instance: TestPayload, operationId: number) => {
    let progress: OperationProgress = { done: 0, status: "running", total: 1 };
    while (progress.status === "running") {
      progress = (
        await callEndpoint<OperationProgress>({
          config: instance.config,
          method: "POST",
          path: `/folders-tree/operations/${operationId}/step`,
          payload: instance.payload,
          payloadInstanceCacheKey: instance.cacheKey,
        })
      ).body;
    }

    return progress;
  };

  it("does not write a row from a path a live page took after it was queued", async () => {
    const { payload } = smallLimitHarness;
    const tree = await seedTree(payload);
    expect((await renameAbout(smallLimitHarness, tree.about.id)).status).toBe(200);
    const { docs } = await findMirrorOperation(payload);
    expect(docs).toHaveLength(1);
    expect(await readMirrorRows(payload)).toEqual([]);

    // A new folder takes the vacated /about and a live page takes /about/contact.
    const taken = await createFolder(payload, { slug: "about" });
    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: taken.id, slug: "contact", title: "New contact" },
      depth: 0,
      overrideAccess: true,
    });
    expect((await stepAll(smallLimitHarness, docs[0].id)).status).toBe("done");

    expect(await rowFrom(payload, "/about/contact")).toBeUndefined();
    expect(await rowFrom(payload, "/de/about/contact")).toBeUndefined();
    // The pages nobody took the path of are still written.
    expect(await rowFrom(payload, "/about/history/timeline")).toBeDefined();
  });

  it("does not overwrite a row that changed after it was queued", async () => {
    const { payload } = smallLimitHarness;
    const tree = await seedTree(payload);
    expect((await renameAbout(smallLimitHarness, tree.about.id)).status).toBe(200);
    const { docs } = await findMirrorOperation(payload);

    // A newer row for the same old URL, as a later move or an editor would write it.
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    await payload.create({
      collection: "redirects",
      data: { from: "/about/contact", to: { type: "custom", url: "/newer" } } as never,
      overrideAccess: true,
    });
    expect((await stepAll(smallLimitHarness, docs[0].id)).status).toBe("done");

    expect((await rowFrom(payload, "/about/contact"))?.to).toMatchObject({
      type: "custom",
      url: "/newer",
    });
    // The row nobody touched is written as queued.
    expect(await rowFrom(payload, "/de/about/contact")).toMatchObject({
      to: { reference: { value: tree.pages.contact.id }, type: "reference" },
    });
  });
});

describe("a large folder rename", () => {
  const adminRequest = (payload: Payload, instance: TestPayload) => ({
    config: instance.config,
    payload,
    payloadInstanceCacheKey: instance.cacheKey,
    user: testUser,
  });

  const renameAbout = (instance: TestPayload, folderId: number) =>
    callEndpoint({
      ...adminRequest(instance.payload, instance),
      body: { slug: "ueber-uns" },
      method: "PATCH",
      path: `/folders/${folderId}?locale=de`,
    });

  it("a 980-page folder rename queues an operation", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload, { large: true });

    const renamed = await renameAbout(harness, tree.about.id);

    expect(renamed.status).toBe(200);
    const { docs } = await findMirrorOperation(payload);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ done: 0, status: "running", total: 980 });
    // Nothing is written until the operation is stepped.
    expect(await readMirrorRows(payload)).toEqual([]);

    let progress: OperationProgress = { done: 0, status: "running", total: 980 };
    let steps = 0;
    while (progress.status === "running") {
      const stepped = await callEndpoint<OperationProgress>({
        ...adminRequest(payload, harness),
        method: "POST",
        path: `/folders-tree/operations/${docs[0].id}/step`,
      });
      expect(stepped.status).toBe(200);
      progress = stepped.body;
      steps += 1;
    }

    expect(progress).toMatchObject({ done: 980, status: "done", total: 980 });
    expect(steps).toBe(5);
    const rows = await readMirrorRows(payload);
    expect(rows).toHaveLength(980);
    expect(rows.every((row) => row.from.startsWith("/de/about/section-"))).toBe(true);
  });

  it("the timing file is written", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload, { large: true });
    const startedAt = performance.now();

    await renameAbout(harness, tree.about.id);
    const { docs } = await findMirrorOperation(payload);
    let progress: OperationProgress = { done: 0, status: "running", total: 980 };
    let steps = 0;
    while (progress.status === "running") {
      progress = (
        await callEndpoint<OperationProgress>({
          ...adminRequest(payload, harness),
          method: "POST",
          path: `/folders-tree/operations/${docs[0].id}/step`,
        })
      ).body;
      steps += 1;
    }
    const durationMs = Math.round(performance.now() - startedAt);

    expect(progress.status).toBe("done");
    const resultsFile = path.resolve(import.meta.dirname, "../results/mirror-timing.json");
    mkdirSync(path.dirname(resultsFile), { recursive: true });
    // One file for both databases: each run adds its own entry and keeps the other's.
    const earlier = existsSync(resultsFile)
      ? (JSON.parse(readFileSync(resultsFile, "utf-8")) as Record<string, unknown>)
      : {};
    writeFileSync(
      resultsFile,
      `${JSON.stringify({ ...earlier, [harness.databaseKind]: { durationMs, mirrorRows: 980, pages: 980, steps } }, null, 2)}\n`
    );
  });
});
