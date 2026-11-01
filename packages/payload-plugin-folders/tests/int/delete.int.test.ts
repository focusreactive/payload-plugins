import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { DeletePreview } from "../../src/core/deleteItems.js";
import type { OperationProgress } from "../../src/core/operations.js";
import { resolvePath } from "../../src/core/resolve.js";
import { moveItems } from "../../src/server/index.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ItemRef = { collection: string; id: number };

type DeleteBody = {
  deleted?: number;
  errors?: Array<{
    data?: { confirmWord?: string; count?: number; items?: ItemRef[]; reason?: string };
    message: string;
  }>;
  operationId?: number;
  total?: number;
  trashed?: number;
};

const password = "test-password";
const drafter = { email: "delete-drafter@example.com", password };

const recorded: Array<{ changes: PathChange[]; reason: PathChangeReason }> = [];

let harness: TestPayload;
let trashHarness: TestPayload;
let mixedTrashHarness: TestPayload;

const afterPathChange = ({
  changes,
  reason,
}: {
  changes: PathChange[];
  reason: PathChangeReason;
}) => {
  recorded.push({ changes, reason });
};

beforeAll(async () => {
  harness = await getTestPayload({ foldersOptions: { hooks: { afterPathChange } } });
  trashHarness = await getTestPayload({
    foldersOptions: { hooks: { afterPathChange } },
    trash: true,
  });
  mixedTrashHarness = await getTestPayload({
    foldersOptions: { hooks: { afterPathChange } },
    trash: "pagesOnly",
  });
  for (const instance of [harness, trashHarness, mixedTrashHarness]) {
    await instance.payload.create({
      collection: "users",
      data: { email: drafter.email, password, role: "drafter" } as never,
      overrideAccess: true,
    });
  }
});

afterAll(async () => {
  await mixedTrashHarness?.destroy();
  await trashHarness?.destroy();
  await harness?.destroy();
});

afterEach(async () => {
  recorded.length = 0;
  for (const instance of [harness, trashHarness, mixedTrashHarness]) {
    await clearTree(instance.payload);
    await instance.payload.db.deleteMany({
      collection: "folder-redirects" as never,
      where: { id: { exists: true } },
    });
  }
});

const call = <TBody>(
  instance: TestPayload,
  method: "DELETE" | "GET" | "PATCH" | "POST",
  path: string,
  body?: unknown,
  user?: { email: string; password: string }
) =>
  callEndpoint<TBody>({
    body,
    config: instance.config,
    method,
    path,
    payload: instance.payload,
    payloadInstanceCacheKey: instance.cacheKey,
    ...(user ? { user } : {}),
  });

const folderRef = (id: number): ItemRef => ({ collection: "folders", id });
const pageRef = (id: number): ItemRef => ({ collection: "pages", id });

const createPage = (
  payload: Payload,
  folder: number | null,
  slug: string,
  extra: Record<string, unknown> = {}
) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title: slug, ...extra } as never,
    depth: 0,
    overrideAccess: true,
  });

const countAll = async (
  payload: Payload,
  collection: "folders" | "folder-redirects" | "pages" | "posts"
) =>
  (
    await payload.db.count({
      collection: collection as never,
      where: { id: { exists: true } },
    })
  ).totalDocs;

const readTrashed = async (payload: Payload, collection: "folders" | "pages", id: number) =>
  (await payload.db.findOne({
    collection,
    where: { id: { equals: id } },
  })) as unknown as { deletedAt?: string | null } | null;

const resolveAt = (payload: Payload, path: string) =>
  resolvePath(payload, { overrideAccess: true, path });

/** `/news` with a root page and two articles, and `/news/archive` with one more. */
const seedNews = async (payload: Payload) => {
  const news = await createFolder(payload, { name: "News", slug: "news" });
  const archive = await createFolder(payload, {
    name: "Archive",
    parent: news.id,
    slug: "archive",
  });
  const root = await createPage(payload, news.id, "news-home", { isFolderRoot: true });
  const first = await createPage(payload, news.id, "first-story");
  const draft = await createPage(payload, news.id, "second-story", { _status: "draft" });
  const old = await createPage(payload, archive.id, "old-story");

  return { archive, draft, first, news, old, root };
};

describe("deleting folders and pages", () => {
  it("REST delete of a non-empty folder is 409", async () => {
    const { payload } = harness;
    const { news, root } = await seedNews(payload);
    const empty = await createFolder(payload, { slug: "empty" });

    const refused = await call<DeleteBody>(harness, "DELETE", `/folders/${news.id}`);

    expect(refused.status).toBe(409);
    expect(refused.body.errors?.[0].message).toContain("not empty");
    // Nothing moved to the top level, nothing was removed.
    expect(await countAll(payload, "folders")).toBe(3);
    expect(await countAll(payload, "pages")).toBe(4);
    const stored = (await payload.db.findOne({
      collection: "pages",
      where: { id: { equals: root.id } },
    })) as unknown as { folder: number };
    expect(stored.folder).toBe(news.id);
    const emptied = await call<DeleteBody>(harness, "DELETE", `/folders/${empty.id}`);
    expect(emptied.status).toBe(200);
    expect(await countAll(payload, "folders")).toBe(2);
  });

  it("recursive delete removes everything and its URLs stop resolving", async () => {
    const { payload } = harness;
    const { archive, first, news, old } = await seedNews(payload);
    const keep = await createFolder(payload, { slug: "keep" });
    await createPage(payload, keep.id, "stays");
    expect(await resolveAt(payload, "/news/first-story")).toMatchObject({ type: "page" });
    expect(await resolveAt(payload, "/news")).toMatchObject({ type: "page" });

    const { body, status } = await call<DeleteBody>(harness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id)],
    });

    expect(status).toBe(200);
    expect(body).toEqual({ deleted: 6, trashed: 0 });
    expect(await countAll(payload, "pages")).toBe(1);
    expect(await countAll(payload, "folders")).toBe(1);
    for (const path of ["/news", "/news/first-story", "/news/archive/old-story"]) {
      expect(await resolveAt(payload, path)).toEqual({ type: "notFound" });
    }
    expect(await resolveAt(payload, "/keep/stays")).toMatchObject({ type: "page" });
    expect([archive.id, first.id, old.id]).toHaveLength(3);
  });

  it("deleting removes the redirect rows that point at the deleted documents", async () => {
    const { payload } = harness;
    const { first, news } = await seedNews(payload);
    const other = await createFolder(payload, { slug: "other" });
    // A move leaves a row for the page and a prefix row for the folder.
    await moveItems(payload, {
      items: [pageRef(first.id)],
      overrideAccess: true,
      toFolder: other.id,
    });
    await moveItems(payload, {
      items: [folderRef(news.id)],
      overrideAccess: true,
      toFolder: other.id,
    });
    expect(await countAll(payload, "folder-redirects")).toBeGreaterThanOrEqual(2);

    const { status } = await call<DeleteBody>(harness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id), pageRef(first.id)],
    });

    expect(status).toBe(200);
    expect(await countAll(payload, "folder-redirects")).toBe(0);
  });

  it("the preview asks for the folder segment above 10 pages", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    const small = await createFolder(payload, { name: "Small", slug: "small" });
    for (let index = 1; index <= 11; index += 1) {
      await createPage(payload, news.id, `story-${index}`);
    }
    await createPage(payload, news.id, "story-draft", { _status: "draft" });
    for (let index = 1; index <= 10; index += 1) {
      await createPage(payload, small.id, `note-${index}`);
    }
    const loose = await createPage(payload, null, "loose");

    const folderPreview = await call<DeletePreview>(
      harness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(news.id)],
      }
    );
    const smallPreview = await call<DeletePreview>(
      harness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(small.id)],
      }
    );
    const mixedPreview = await call<DeletePreview>(
      harness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(news.id), pageRef(loose.id)],
      }
    );

    expect(folderPreview.status).toBe(200);
    expect(folderPreview.body).toMatchObject({
      confirmWord: "news",
      folders: 1,
      pages: 12,
      publishedUrls: 22,
      trash: false,
    });
    expect(folderPreview.body.sample).toContain("/news/story-1 (published)");
    expect(folderPreview.body.sample).toContain("/news/story-draft (draft)");
    expect(folderPreview.body.sample).toContain("/news (folder)");
    expect(smallPreview.body.confirmWord).toBeNull();
    expect(mixedPreview.body.confirmWord).toBe("delete");
    // The preview wrote nothing.
    expect(await countAll(payload, "pages")).toBe(23);
  });

  it("a wrong confirm word is 400", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    for (let index = 1; index <= 11; index += 1) {
      await createPage(payload, news.id, `story-${index}`);
    }
    const attempt = (confirmWord?: string) =>
      call<DeleteBody>(harness, "POST", "/folders-tree/delete", {
        confirmWord,
        items: [folderRef(news.id)],
      });

    const missing = await attempt();
    const wrong = await attempt("blog");
    const shouting = await attempt("NEWS");

    for (const refused of [missing, wrong, shouting]) {
      expect(refused.status).toBe(400);
      expect(refused.body.errors?.[0].data).toMatchObject({
        confirmWord: "news",
        reason: "confirm",
      });
      expect(refused.body.errors?.[0].message).toBe("Type news to confirm");
    }
    expect(await countAll(payload, "pages")).toBe(11);
    expect(await countAll(payload, "folders")).toBe(1);

    const confirmed = await attempt(" news ");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toEqual({ deleted: 12, trashed: 0 });
    expect(await countAll(payload, "pages")).toBe(0);
  });

  it("deleting a root page reports the folder URL loss", async () => {
    const { payload } = harness;
    const { first, news, root } = await seedNews(payload);
    const draftOnly = await createPage(payload, news.id, "never-live", { _status: "draft" });

    // A stock delete of the root page.
    const stock = await call<unknown>(harness, "DELETE", `/pages/${root.id}`);

    expect(stock.status).toBe(200);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toBe("delete");
    // Live in en and, through the locale fallback, in de.
    expect(recorded[0].changes).toEqual(
      ["en", "de"].map((locale) => ({
        collection: "pages",
        from: "/news",
        id: root.id,
        kind: "page",
        locale,
        published: true,
        to: null,
      }))
    );
    // The folder URL is gone: the folder has no root page now.
    expect(await resolveAt(payload, "/news")).toEqual({ type: "notFound" });

    // A draft that was never live had no URL to lose.
    recorded.length = 0;
    await call<unknown>(harness, "DELETE", `/pages/${draftOnly.id}`);
    expect(recorded).toHaveLength(0);

    // The recursive delete reports everything it took down in one call.
    const { status } = await call<DeleteBody>(harness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id)],
    });
    expect(status).toBe(200);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toBe("delete");
    expect([...new Set(recorded[0].changes.map((change) => change.from))].sort()).toEqual([
      "/news/archive/old-story",
      "/news/first-story",
    ]);
    expect(first.id).toBeDefined();
  });

  it("a user who may not delete one item deletes nothing", async () => {
    const { payload } = harness;
    const { news } = await seedNews(payload);

    const refused = await call<DeleteBody>(
      harness,
      "POST",
      "/folders-tree/delete",
      { items: [folderRef(news.id)] },
      drafter
    );

    expect(refused.status).toBe(403);
    expect(refused.body.errors?.[0].data?.reason).toBe("forbidden");
    expect(refused.body.errors?.[0].data?.items?.length).toBeGreaterThan(0);
    expect(JSON.stringify(refused.body)).not.toMatch(/story/u);
    expect(await countAll(payload, "pages")).toBe(4);
    expect(await countAll(payload, "folders")).toBe(2);
  });

  it("a refusal counts every refused document though it lists only the first 50", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    for (let index = 1; index <= 60; index += 1) {
      await payload.create({
        collection: "pages",
        context: { foldersInternal: true },
        data: {
          _status: "published",
          folder: news.id,
          orderKey: `a${String(index).padStart(4, "0")}`,
          slug: `story-${index}`,
          structureRevision: 0,
          title: `Story ${index}`,
        } as never,
        depth: 0,
        overrideAccess: true,
      });
    }

    const refused = await call<DeleteBody>(
      harness,
      "POST",
      "/folders-tree/delete",
      { items: [folderRef(news.id)] },
      drafter
    );

    expect(refused.status).toBe(403);
    // 60 pages and the folder itself.
    expect(refused.body.errors?.[0].data?.count).toBe(61);
    expect(refused.body.errors?.[0].data?.items).toHaveLength(50);
    expect(await countAll(payload, "pages")).toBe(60);
  });

  it("a 300-page folder delete runs as an operation", async () => {
    const { payload } = harness;
    const bulk = await createFolder(payload, { name: "Bulk", slug: "bulk" });
    for (let index = 1; index <= 300; index += 1) {
      await payload.create({
        collection: "posts",
        context: { foldersInternal: true },
        data: {
          folder: bulk.id,
          orderKey: `a${String(index).padStart(4, "0")}`,
          slug: `bulk-${index}`,
          structureRevision: 0,
          title: `Bulk ${index}`,
        },
        depth: 0,
        overrideAccess: true,
      });
    }

    const started = await call<DeleteBody>(harness, "POST", "/folders-tree/delete", {
      confirmWord: "bulk",
      items: [folderRef(bulk.id)],
    });
    expect(started.body).toMatchObject({ total: 301 });
    const operationId = started.body.operationId as number;
    expect(await countAll(payload, "posts")).toBe(300);

    const first = await call<OperationProgress>(
      harness,
      "POST",
      `/folders-tree/operations/${operationId}/step`
    );
    expect(first.body).toEqual({ done: 200, status: "running", total: 301 });
    expect(await countAll(payload, "posts")).toBe(100);
    expect(await countAll(payload, "folders")).toBe(1);

    const second = await call<OperationProgress>(
      harness,
      "POST",
      `/folders-tree/operations/${operationId}/step`
    );
    expect(second.body).toEqual({ done: 301, status: "done", total: 301 });
    expect(await countAll(payload, "posts")).toBe(0);
    expect(await countAll(payload, "folders")).toBe(0);
  });
});

describe("deleting with the trash on", () => {
  it("with trash on everywhere the delete is soft", async () => {
    const { payload } = trashHarness;
    const { first, news, old, root } = await seedNews(payload);
    const other = await createFolder(payload, { slug: "other" });
    await moveItems(payload, {
      items: [pageRef(first.id)],
      overrideAccess: true,
      toFolder: other.id,
    });
    await moveItems(payload, {
      items: [pageRef(first.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    expect(await countAll(payload, "folder-redirects")).toBeGreaterThan(0);

    const preview = await call<DeletePreview>(
      trashHarness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(news.id)],
      }
    );
    const { body, status } = await call<DeleteBody>(trashHarness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id)],
    });

    expect(preview.body.trash).toBe(true);
    expect(status).toBe(200);
    expect(body).toEqual({ deleted: 0, trashed: 6 });
    // The rows are still there, in the trash.
    expect(await countAll(payload, "pages")).toBe(4);
    expect(await countAll(payload, "folders")).toBe(3);
    expect((await readTrashed(payload, "pages", old.id))?.deletedAt).toBeTruthy();
    expect((await readTrashed(payload, "folders", news.id))?.deletedAt).toBeTruthy();
    // Nothing resolves, and nothing redirects to a document in the trash.
    for (const path of ["/news", "/news/first-story", "/news/archive/old-story"]) {
      expect(await resolveAt(payload, path)).toEqual({ type: "notFound" });
    }
    expect(await countAll(payload, "folder-redirects")).toBe(0);
    // The stock list hides trashed pages.
    expect(
      (
        await payload.find({
          collection: "pages",
          overrideAccess: true,
          where: { id: { equals: root.id } },
        })
      ).totalDocs
    ).toBe(0);
    // A trashed document is reported like a deleted one.
  });

  it("reports the URLs a soft delete takes down", async () => {
    const { payload } = trashHarness;
    const { news } = await seedNews(payload);

    await call<DeleteBody>(trashHarness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id)],
    });

    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toBe("delete");
    expect([...new Set(recorded[0].changes.map((change) => change.from))].sort()).toEqual([
      "/news",
      "/news/archive/old-story",
      "/news/first-story",
    ]);
  });

  it("reports the URL of a published page with a newer draft when it goes to the trash", async () => {
    const { payload } = trashHarness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    const story = await createPage(payload, news.id, "story");
    await payload.update({
      collection: "pages",
      data: { title: "Story, next version" },
      depth: 0,
      draft: true,
      id: story.id,
      overrideAccess: true,
    });

    await call<DeleteBody>(trashHarness, "POST", "/folders-tree/delete", {
      items: [pageRef(story.id)],
    });

    // The trash turns the page into a draft on the way, so the URL is read from before.
    expect(recorded).toHaveLength(1);
    expect(recorded[0].changes.map((change) => change.from)).toContain("/news/story");
    expect(await resolveAt(payload, "/news/story")).toEqual({ type: "notFound" });
  });

  it("a stock trash of a non-empty folder is 409", async () => {
    const { payload } = trashHarness;
    const { news } = await seedNews(payload);

    const refused = await call<DeleteBody>(trashHarness, "PATCH", `/folders/${news.id}`, {
      deletedAt: new Date().toISOString(),
    });

    expect(refused.status).toBe(409);
    expect((await readTrashed(payload, "folders", news.id))?.deletedAt ?? null).toBeNull();
  });

  it("restoring a page whose folder is trashed is refused", async () => {
    const { payload } = trashHarness;
    const { archive, news, old, root } = await seedNews(payload);
    await call<DeleteBody>(trashHarness, "POST", "/folders-tree/delete", {
      items: [folderRef(news.id)],
    });

    const restorePage = (id: number) =>
      call<DeleteBody>(trashHarness, "PATCH", `/pages/${id}?trash=true`, { deletedAt: null });
    const restoreFolder = (id: number) =>
      call<DeleteBody>(trashHarness, "PATCH", `/folders/${id}?trash=true`, { deletedAt: null });

    const refusedPage = await restorePage(old.id);
    const refusedSubfolder = await restoreFolder(archive.id);

    expect(refusedPage.status).toBe(409);
    expect(refusedPage.body.errors?.[0].message).toBe("Restore its folder /news/archive first");
    expect(refusedSubfolder.status).toBe(409);
    expect(refusedSubfolder.body.errors?.[0].message).toBe("Restore its parent folder /news first");
    expect((await readTrashed(payload, "pages", old.id))?.deletedAt).toBeTruthy();

    // Folders come back top down, then their pages.
    expect((await restoreFolder(news.id)).status).toBe(200);
    expect((await restoreFolder(archive.id)).status).toBe(200);
    const restored = await restorePage(old.id);
    expect(restored.status).toBe(200);
    expect((await readTrashed(payload, "pages", old.id))?.deletedAt ?? null).toBeNull();
    expect((await restorePage(root.id)).status).toBe(200);
  });
});

describe("deleting when only some collections have a trash", () => {
  it("a permanent delete takes the trashed pages of the folder along and counts them", async () => {
    const { payload } = mixedTrashHarness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    await createPage(payload, news.id, "live-story");
    const trashed = await createPage(payload, news.id, "trashed-story");
    await payload.create({
      collection: "posts",
      data: { folder: news.id, slug: "a-post", title: "A post" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { deletedAt: new Date().toISOString() } as never,
      depth: 0,
      id: trashed.id,
      overrideAccess: true,
    });

    const preview = await call<DeletePreview>(
      mixedTrashHarness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(news.id)],
      }
    );
    const { body, status } = await call<DeleteBody>(
      mixedTrashHarness,
      "POST",
      "/folders-tree/delete",
      { items: [folderRef(news.id)] }
    );

    expect(status).toBe(200);
    expect(body).toEqual({ deleted: 4, trashed: 0 });
    expect(preview.body).toMatchObject({ folders: 1, inTrash: 1, pages: 3, trash: false });
    expect(await countAll(payload, "pages")).toBe(0);
    expect(await countAll(payload, "posts")).toBe(0);
    expect(await countAll(payload, "folders")).toBe(0);
  });

  it("a soft delete counts nothing as already in the trash", async () => {
    const { payload } = trashHarness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    await createPage(payload, news.id, "live-story");

    const preview = await call<DeletePreview>(
      trashHarness,
      "POST",
      "/folders-tree/delete/preview",
      {
        items: [folderRef(news.id)],
      }
    );

    expect(preview.body).toMatchObject({ inTrash: 0, trash: true });
  });
});
