import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createPayloadRequest } from "payload";
import { generateNKeysBetween } from "payload/shared";
import type { Payload, PayloadRequest } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getChildren, searchTree } from "../../src/server/index.js";
import type { TreeItem } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbCalls } from "../helpers/countDbCalls.js";
import { countDbReads } from "../helpers/countDbReads.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ChildrenBody = {
  hasMore: boolean;
  items: TreeItem[];
  nextCursor: string | null;
  revision: number;
};

let harness: TestPayload;

beforeAll(async () => {
  // posts are labelled "Article", so the word `article` names a page type in the search tests.
  harness = await getTestPayload({
    foldersOptions: { collections: { pages: true, posts: { label: "Article" } } as never },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const asUser = async (
  payload: Payload,
  role: "admin" | "drafter" | "editor" | "editorLimited",
  limitedFolder?: number
): Promise<PayloadRequest> => {
  const email = `${role}-${Math.random().toString(36).slice(2)}@example.com`;
  const user = await payload.create({
    collection: "users",
    data: { email, limitedFolder, password: "test-password", role } as never,
    overrideAccess: true,
  });

  return createPayloadRequest({
    payload,
    req: {},
    user: { ...user, collection: "users" } as never,
  });
};

const children = (
  request: PayloadRequest,
  args: {
    childCountReadLimit?: number;
    cursor?: string | null;
    limit?: number;
    locale?: string;
    parent: number | null;
  }
) => getChildren(request, args);

const titles = (items: TreeItem[]): string[] => items.map((item) => item.title);

const keyOf = (item: TreeItem): string => `${item.collection}:${item.id}`;

/** Pages and posts written without the plugin's hooks, with the keys and dates the test names. */
const createInternal = async (
  payload: Payload,
  collection: "pages" | "posts",
  data: {
    createdAt?: string;
    folder: number | null;
    orderKey: string | null;
    slug: string;
    title: string;
    status?: "draft" | "published";
  }
): Promise<{ id: number }> => {
  const { createdAt, status, ...rest } = data;
  const doc = await payload.create({
    collection,
    context: { foldersInternal: true },
    data: {
      ...rest,
      pathSegment: data.slug,
      structureRevision: 0,
      ...(collection === "pages" ? { _status: status ?? "published" } : {}),
    } as never,
    depth: 0,
    draft: collection === "pages" && status === "draft",
    overrideAccess: true,
  });
  if (createdAt) {
    await payload.db.updateOne({
      collection,
      data: { createdAt },
      id: doc.id,
      returning: false,
    });
  }

  return doc as unknown as { id: number };
};

const countsOn = (calls: Array<{ collection: string; method: string }>, collection: string) =>
  calls.filter((call) => call.method === "count" && call.collection === collection).length;

/** A host `update` access that answers with a `Where` for every user. */
const whereAccess = () => ({ id: { exists: true } });

const makePage = (payload: Payload, slug: string, status: "draft" | "published" = "published") =>
  payload.create({
    collection: "pages",
    data: { _status: status, slug, title: `Item ${slug}` } as never,
    depth: 0,
    draft: status === "draft",
    overrideAccess: true,
  });

const clearOrderKey = (
  payload: Payload,
  collection: "folders" | "pages" | "posts",
  id: number,
  createdAt: string
) =>
  payload.db.updateOne({
    collection,
    data: { createdAt, orderKey: null },
    id,
    returning: false,
  });

describe("GET /folders-tree/children", () => {
  it("children mix folders and pages by order key", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    // Each create lands on top, so the tree reads newest first, whatever the collection.
    await createFolder(payload, { name: "Alpha", slug: "alpha" });
    await payload.create({
      collection: "pages",
      data: { slug: "bravo", title: "Bravo" } as never,
      depth: 0,
      overrideAccess: true,
    });
    await payload.create({
      collection: "posts",
      data: { slug: "charlie", title: "Charlie" },
      depth: 0,
      overrideAccess: true,
    });
    await createFolder(payload, { name: "Delta", slug: "delta" });

    const result = await children(request, { parent: null });

    expect(titles(result.items)).toEqual(["Delta", "Charlie", "Bravo", "Alpha"]);
    expect(result.items.map((item) => item.kind)).toEqual(["folder", "page", "page", "folder"]);
    expect(result.items.map((item) => item.collection)).toEqual([
      "folders",
      "posts",
      "pages",
      "folders",
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(typeof result.revision).toBe("number");
    const keys = result.items.map((item) => item.orderKey as string);
    expect(keys).toEqual([...keys].sort());
  });

  it("pagination at limit 2 across collections has no duplicates or gaps", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const parent = await createFolder(payload, { slug: "bulk" });
    const orderKeys = generateNKeysBetween(null, null, 11);
    for (let index = 0; index < 11; index += 1) {
      const collection = (["pages", "posts", "folders"] as const)[index % 3];
      if (collection === "folders") {
        await createFolder(payload, {
          name: `Item ${index}`,
          parent: parent.id,
          slug: `item-${index}`,
        });
        continue;
      }
      await createInternal(payload, collection, {
        folder: parent.id,
        orderKey: orderKeys[index],
        slug: `item-${index}`,
        title: `Item ${index}`,
      });
    }
    // Keyed rows, then unkeyed ones, so pages also cross that border.
    const unkeyed = [
      await createInternal(payload, "pages", {
        folder: parent.id,
        orderKey: null,
        slug: "late-a",
        title: "Late A",
      }),
      await createInternal(payload, "posts", {
        folder: parent.id,
        orderKey: null,
        slug: "late-b",
        title: "Late B",
      }),
      await createInternal(payload, "posts", {
        folder: parent.id,
        orderKey: null,
        slug: "late-c",
        title: "Late C",
      }),
    ];
    await clearOrderKey(payload, "pages", unkeyed[0].id, "2020-01-01T00:00:03.000Z");
    await clearOrderKey(payload, "posts", unkeyed[1].id, "2020-01-01T00:00:01.000Z");
    await clearOrderKey(payload, "posts", unkeyed[2].id, "2020-01-01T00:00:02.000Z");

    const whole = await children(request, { limit: 100, parent: parent.id });
    expect(whole.items).toHaveLength(14);

    const seen: TreeItem[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<typeof children>> = await children(request, {
        cursor,
        limit: 2,
        parent: parent.id,
      });
      expect(page.items.length).toBeLessThanOrEqual(2);
      seen.push(...page.items);
      cursor = page.nextCursor;
      pages += 1;
      expect(page.hasMore).toBe(cursor !== null);
    } while (cursor !== null && pages < 50);

    expect(pages).toBe(7);
    expect(new Set(seen.map(keyOf)).size).toBe(seen.length);
    expect(seen.map(keyOf)).toEqual(whole.items.map(keyOf));
  });

  it("pagination across equal order keys of different collections loses no row", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const folder = await createFolder(payload, { name: "Twin", slug: "twin" });
    // Equal keys happen when rows are written behind the plugin's back; verify and repair list them.
    await payload.db.updateOne({
      collection: "folders",
      data: { orderKey: "a5" },
      id: folder.id,
      returning: false,
    });
    for (const [collection, slug] of [
      ["pages", "page-one"],
      ["pages", "page-two"],
      ["posts", "post-one"],
      ["posts", "post-two"],
    ] as const) {
      await createInternal(payload, collection, {
        folder: null,
        orderKey: "a5",
        slug,
        title: slug,
      });
    }
    await createInternal(payload, "pages", {
      folder: null,
      orderKey: "a6",
      slug: "after",
      title: "after",
    });

    const whole = await children(request, { limit: 100, parent: null });
    const seen: TreeItem[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof children>> = await children(request, {
        cursor,
        limit: 1,
        parent: null,
      });
      seen.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor !== null && seen.length < 20);

    expect(whole.items).toHaveLength(6);
    expect(seen.map(keyOf)).toEqual(whole.items.map(keyOf));
    expect(new Set(seen.map(keyOf)).size).toBe(6);
    // Folders sort before pages on a tie, then by collection, then by id.
    expect(whole.items.slice(0, 5).map((item) => item.collection)).toEqual([
      "folders",
      "pages",
      "pages",
      "posts",
      "posts",
    ]);
  });

  it("unkeyed rows come last on every adapter", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const keyed = await createInternal(payload, "pages", {
      folder: null,
      orderKey: "a0",
      slug: "keyed",
      title: "Keyed",
    });
    const oldest = await createInternal(payload, "posts", {
      folder: null,
      orderKey: null,
      slug: "oldest",
      title: "Oldest",
    });
    const newest = await createInternal(payload, "pages", {
      folder: null,
      orderKey: null,
      slug: "newest",
      title: "Newest",
    });
    const folder = await createFolder(payload, { name: "Folder", slug: "folder" });
    // The keyed folder sorts after the keyed page here; the unkeyed rows still follow both.
    await payload.db.updateOne({
      collection: "folders",
      data: { orderKey: "a1" },
      id: folder.id,
      returning: false,
    });
    await clearOrderKey(payload, "posts", oldest.id, "2020-01-01T00:00:00.000Z");
    await clearOrderKey(payload, "pages", newest.id, "2020-06-01T00:00:00.000Z");

    const result = await children(request, { parent: null });

    expect(titles(result.items)).toEqual(["Keyed", "Folder", "Oldest", "Newest"]);
    expect(result.items.map((item) => item.orderKey)).toEqual(["a0", "a1", null, null]);
    expect(keyed.id).toBeGreaterThan(0);
  });

  it("status is draft, published, changed or live", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await payload.create({
      collection: "pages",
      data: { _status: "draft", slug: "idea", title: "Idea" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "live-page", title: "Published page" } as never,
      depth: 0,
      overrideAccess: true,
    });
    const changed = await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "edited", title: "Changed page" } as never,
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { _status: "draft", title: "Changed page again" } as never,
      depth: 0,
      draft: true,
      id: changed.id,
      overrideAccess: true,
    });
    await payload.create({
      collection: "posts",
      data: { slug: "post", title: "A post" },
      depth: 0,
      overrideAccess: true,
    });

    const { items } = await children(request, { parent: null });
    const statusOf = (title: string) => items.find((item) => item.title === title)?.status;

    expect(statusOf("Idea")).toBe("draft");
    expect(statusOf("Published page")).toBe("published");
    // The main row keeps the published title; the newer draft makes the page `changed`.
    expect(statusOf("Changed page")).toBe("changed");
    expect(statusOf("A post")).toBe("live");
    const folder = await createFolder(payload, { slug: "no-status" });
    const folderItem = (await children(request, { parent: null })).items.find(
      (item) => item.id === folder.id
    );
    expect(folderItem?.status).toBeUndefined();
  });

  it("a locale served through fallback shows the default title and the published status", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "welcome", title: "Welcome" } as never,
      depth: 0,
      overrideAccess: true,
    });

    const { items } = await children(request, { locale: "de", parent: null });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      fullPath: "/welcome",
      slug: "welcome",
      slugIsFallback: true,
      status: "published",
      title: "Welcome",
    });
  });

  it("a locale with its own draft status reads draft even when en is published", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const page = await payload.create({
      collection: "pages",
      data: { _status: "draft", slug: "entwurf", title: "Entwurf" } as never,
      depth: 0,
      draft: true,
      locale: "de",
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "draft-page", title: "Draft page" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });

    const german = await children(request, { locale: "de", parent: null });
    const english = await children(request, { locale: "en", parent: null });

    // decision 24: a status of its own beats the fallback, so de is still a draft.
    expect(german.items[0].status).toBe("draft");
    expect(english.items[0].status).toBe("published");
  });

  it("child counts switch to count queries past the read limit and stay exact", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const big = await createFolder(payload, { name: "Big", slug: "big" });
    const small = await createFolder(payload, { name: "Small", slug: "small" });
    const keys = generateNKeysBetween(null, null, 25);
    for (let index = 0; index < 25; index += 1) {
      await createInternal(payload, "posts", {
        folder: big.id,
        orderKey: keys[index],
        slug: `post-${index}`,
        title: `Post ${index}`,
      });
    }
    await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: big.id,
        isFolderRoot: true,
        slug: "home",
        title: "Home",
      } as never,
      depth: 0,
      overrideAccess: true,
    });
    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: small.id, slug: "one", title: "One" } as never,
      depth: 0,
      overrideAccess: true,
    });

    const normal = await countDbCalls(payload, () => children(request, { parent: null }));
    const limited = await countDbCalls(payload, () =>
      children(request, { childCountReadLimit: 10, parent: null })
    );

    for (const { result } of [normal, limited]) {
      const bigItem = result.items.find((item) => item.id === big.id) as TreeItem;
      const smallItem = result.items.find((item) => item.id === small.id) as TreeItem;
      expect(bigItem).toMatchObject({ childCount: 26, hasRootPage: true });
      expect(smallItem).toMatchObject({ childCount: 1, hasRootPage: false });
    }
    expect(normal.calls.some((call) => call.method === "count")).toBe(false);
    // The 25 posts exceed the limit of 10, so they are counted per folder; pages (2 rows) and
    // folders (none) stay within one read each.
    expect(countsOn(limited.calls, "posts")).toBe(2);
    expect(countsOn(limited.calls, "pages")).toBe(0);
    expect(countsOn(limited.calls, "folders")).toBe(0);
  });

  it("folders carry child counts and root-page flags, pages their root flag", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const tree = await seedTree(payload);
    const empty = await createFolder(payload, { slug: "empty" });

    const { items } = await children(request, { parent: null });
    const about = items.find((item) => item.id === tree.about.id) as TreeItem;
    const blog = items.find((item) => item.id === tree.blog.id) as TreeItem;
    const none = items.find((item) => item.id === empty.id) as TreeItem;

    // about holds team, history, contact and its root page.
    expect(about).toMatchObject({ childCount: 4, hasRootPage: true, kind: "folder" });
    expect(blog).toMatchObject({ childCount: 1, hasRootPage: false });
    expect(none).toMatchObject({ childCount: 0, hasRootPage: false });

    const inside = await children(request, { parent: tree.about.id });
    const rootPage = inside.items.find((item) => item.isFolderRoot) as TreeItem;
    expect(rootPage).toMatchObject({ fullPath: "/about", kind: "page", parentId: tree.about.id });
    const contact = inside.items.find((item) => item.id === tree.pages.contact.id) as TreeItem;
    expect(contact).toMatchObject({ depth: 2, fullPath: "/about/contact", slug: "contact" });
  });

  it("access flags follow the user's role and the Where their access returns", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const admin = await asUser(payload, "admin");
    const drafter = await asUser(payload, "drafter");
    const limited = await asUser(payload, "editorLimited", tree.about.id);

    const flagsOf = async (request: PayloadRequest, parent: number | null) =>
      Object.fromEntries(
        (await children(request, { parent })).items.map((item) => [
          `${item.collection}:${item.id}`,
          item.access,
        ])
      );

    const adminFlags = await flagsOf(admin, tree.about.id);
    expect(adminFlags[`pages:${tree.pages.contact.id}`]).toEqual({
      delete: true,
      publish: true,
      update: true,
    });
    // The drafter may save but not publish (the dev role's update refuses `_status: published`).
    const drafterFlags = await flagsOf(drafter, tree.about.id);
    expect(drafterFlags[`pages:${tree.pages.contact.id}`]).toEqual({
      delete: true,
      publish: false,
      update: true,
    });
    // editorLimited returns a Where: inside about the rows match, in blog they do not.
    const limitedInside = await flagsOf(limited, tree.about.id);
    expect(limitedInside[`pages:${tree.pages.contact.id}`]?.update).toBe(true);
    const limitedRoot = await flagsOf(limited, null);
    expect(limitedRoot[`folders:${tree.about.id}`]?.update).toBe(true);
    expect(limitedRoot[`folders:${tree.blog.id}`]).toEqual({
      delete: expect.any(Boolean),
      publish: false,
      update: false,
    });
  });

  it("100 rows across 2 collections take at most 12 database calls", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const parent = await createFolder(payload, { slug: "bulk" });
    const keys = generateNKeysBetween(null, null, 100);
    for (let index = 0; index < 100; index += 1) {
      if (index < 10) {
        await createFolder(payload, {
          name: `Folder ${index}`,
          parent: parent.id,
          slug: `f-${index}`,
        });
        continue;
      }
      await createInternal(payload, index % 2 === 0 ? "pages" : "posts", {
        folder: parent.id,
        orderKey: keys[index],
        slug: `row-${index}`,
        title: `Row ${index}`,
      });
    }
    const folders = (await children(request, { limit: 100, parent: parent.id })).items.filter(
      (item) => item.kind === "folder"
    );
    expect(folders).toHaveLength(10);

    const { reads, result } = await countDbReads(payload, () =>
      children(request, { limit: 100, parent: parent.id })
    );

    expect(result.items).toHaveLength(100);
    expect(result.hasMore).toBe(false);
    // The parent, three keyed reads, three for the unkeyed rows, versions of pages, the child
    // counts (folders, pages, posts) and the revision.
    expect(reads).toBeLessThanOrEqual(12);
    mkdirSync(path.resolve(import.meta.dirname, "../../.run"), { recursive: true });
    writeFileSync(
      path.resolve(
        import.meta.dirname,
        `../../.run/g9-children-calls-${harness.databaseKind}.json`
      ),
      JSON.stringify({ reads, rows: result.items.length })
    );
  });

  it("an unreadable cursor is a 400 and anonymous is refused", async () => {
    const { payload } = harness;
    await seedTree(payload);
    const bad = await callEndpoint<unknown>({
      config: harness.config,
      path: "/folders-tree/children?parent=root&cursor=not-a-cursor",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(bad.status).toBe(400);
    // Well-formed JSON that names a collection outside the tree, or no sort value, is refused too:
    // a cursor's values go into a query.
    for (const forged of [
      { collection: "users", id: 1, kind: "page", phase: "keyed", value: "a0" },
      { collection: "pages", id: 1, kind: "page", phase: "keyed" },
      { collection: "pages", id: { $gt: 0 }, kind: "page", phase: "keyed", value: "a0" },
      { collection: "pages", id: 1, kind: "page", phase: "later", value: "a0" },
    ]) {
      const refused = await callEndpoint<unknown>({
        config: harness.config,
        path: `/folders-tree/children?parent=root&cursor=${Buffer.from(JSON.stringify(forged)).toString("base64url")}`,
        payload,
        payloadInstanceCacheKey: harness.cacheKey,
      });
      expect(refused.status).toBe(400);
    }
    const anonymous = await callEndpoint<unknown>({
      anonymous: true,
      config: harness.config,
      path: "/folders-tree/children?parent=root",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(anonymous.status).toBe(403);
    const missing = await callEndpoint<unknown>({
      config: harness.config,
      path: "/folders-tree/children?parent=99999",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(missing.status).toBe(404);
  });

  it("the endpoint answers the documented shape", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body, status } = await callEndpoint<ChildrenBody>({
      config: harness.config,
      path: `/folders-tree/children?parent=${tree.about.id}&locale=de&limit=2`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });

    expect(status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.hasMore).toBe(true);
    expect(typeof body.nextCursor).toBe("string");
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        access: expect.any(Object),
        collection: expect.any(String),
        depth: expect.any(Number),
        kind: expect.any(String),
        title: expect.any(String),
      })
    );
  });
});

describe("children p95", () => {
  it("children p95 is under 300 ms with the large seed", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const tree = await seedTree(payload, { large: true });
    const durations: number[] = [];

    // about holds 20 folders of 49 posts each: the child counts read 980 rows.
    for (let run = 0; run < 40; run += 1) {
      const startedAt = performance.now();
      const result = await children(request, { limit: 100, parent: tree.about.id });
      durations.push(performance.now() - startedAt);
      expect(result.items).toHaveLength(20);
      expect(result.items.every((item) => item.childCount === 49)).toBe(true);
    }
    const sorted = [...durations].sort((left, right) => left - right);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];

    mkdirSync(path.resolve(import.meta.dirname, "../../.run"), { recursive: true });
    writeFileSync(
      path.resolve(import.meta.dirname, `../../.run/g9-children-p95-${harness.databaseKind}.json`),
      JSON.stringify({ medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: p95, runs: 40 })
    );
    expect(p95).toBeLessThan(300);
  });
});

const search = (
  request: PayloadRequest,
  args: {
    folder?: number | null;
    query: string;
    scope?: "all" | "folder";
    status?: Array<"changed" | "draft" | "live" | "published">;
    types?: string[];
  },
  extra: { candidateLimit?: number } = {}
) => searchTree(request, { folder: args.folder ?? null, ...args, ...extra });

const paths = (items: TreeItem[]): string[] => items.map((item) => item.fullPath);

/** blog/2026/new-year (an article), a page in blog, and a look-alike archive/blog tree. */
const seedSearchTree = async (payload: Payload) => {
  const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
  const year = await createFolder(payload, { name: "2026", parent: blog.id, slug: "2026" });
  const archive = await createFolder(payload, { name: "Archive", slug: "archive" });
  const archivedBlog = await createFolder(payload, {
    name: "Blog",
    parent: archive.id,
    slug: "blog",
  });
  const make = (collection: "pages" | "posts", folder: number, slug: string, title: string) =>
    payload.create({
      collection,
      data: {
        ...(collection === "pages" ? { _status: "published" } : {}),
        folder,
        slug,
        title,
      } as never,
      depth: 0,
      overrideAccess: true,
    });
  const newYear = await make("posts", year.id, "new-year", "New Year");
  const party = await make("posts", year.id, "party", "New Year Party");
  const reversed = await make("posts", year.id, "reversed", "Year New Party");
  const about = await make("pages", blog.id, "about-the-year", "About the year");
  const old = await make("posts", archivedBlog.id, "old-news", "Old news");

  return { about, archive, archivedBlog, blog, newYear, old, party, reversed, year };
};

describe("GET /folders-tree/search", () => {
  it("search from blog finds blog/2026/new-year", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    const tree = await seedSearchTree(payload);

    const result = await search(request, { folder: tree.blog.id, query: "new year" });

    expect(paths(result.items)).toEqual([
      "/blog/2026/new-year",
      "/blog/2026/party",
      "/blog/2026/reversed",
    ]);
    // Scoped by ancestor ids, so the other `blog` folder under archive is not in it, and the
    // search folder itself is not a hit.
    expect(paths(result.items).every((entry) => entry.startsWith("/blog/"))).toBe(true);
    expect(result.items.find((item) => item.fullPath === "/blog/2026/new-year")).toMatchObject({
      collection: "posts",
      kind: "page",
      title: "New Year",
    });
    // Ordered by full path.
    expect(paths(result.items)).toEqual([...paths(result.items)].sort());

    const everywhere = await search(request, { folder: tree.blog.id, query: "news", scope: "all" });
    expect(paths(everywhere.items)).toEqual(["/archive/blog/old-news"]);
    const scoped = await search(request, { folder: tree.blog.id, query: "news" });
    expect(scoped.items).toEqual([]);
  });

  it("matches the folder path, and every word has to match", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await seedSearchTree(payload);

    // `2026` is in the folder path of both articles, `party` in only one title.
    const result = await search(request, { query: "2026 party", scope: "all" });
    expect(paths(result.items)).toEqual(["/blog/2026/party", "/blog/2026/reversed"]);
  });

  it("a quoted phrase matches exactly", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await seedSearchTree(payload);

    const words = await search(request, { query: "year new", scope: "all" });
    const phrase = await search(request, { query: '"new year"', scope: "all" });

    // Unquoted, the words match in any order.
    expect(words.items.map((item) => item.title).sort()).toEqual([
      "New Year",
      "New Year Party",
      "Year New Party",
    ]);
    expect(phrase.items.map((item) => item.title).sort()).toEqual(["New Year", "New Year Party"]);
    const wrongPhrase = await search(request, { query: '"year new"', scope: "all" });
    expect(wrongPhrase.items.map((item) => item.title)).toEqual(["Year New Party"]);
  });

  it("a percent or underscore in the query is not a wildcard", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await payload.create({
      collection: "posts",
      data: { slug: "snake", title: "a_b" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.create({
      collection: "posts",
      data: { slug: "other", title: "axb" },
      depth: 0,
      overrideAccess: true,
    });

    const result = await search(request, { query: "a_b", scope: "all" });

    expect(result.items.map((item) => item.title)).toEqual(["a_b"]);
  });

  it("the word article limits results to that type", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await seedSearchTree(payload);

    const onlyArticles = await search(request, { query: "article year", scope: "all" });
    const allArticles = await search(request, { query: "article", scope: "all" });
    const withoutType = await search(request, { query: "year", scope: "all" });

    // "About the year" is a page and "year" matches it, but the type word keeps only articles.
    expect(onlyArticles.items.every((item) => item.collection === "posts")).toBe(true);
    expect(onlyArticles.items).toHaveLength(3);
    expect(allArticles.items.every((item) => item.collection === "posts")).toBe(true);
    expect(allArticles.items).toHaveLength(4);
    expect(withoutType.items.map((item) => item.collection)).toContain("pages");
    // The folders' own label does the same for folders.
    const folders = await search(request, { query: "folder blog", scope: "all" });
    expect(folders.items.every((item) => item.kind === "folder")).toBe(true);
    // blog, blog/2026 and archive/blog all have `blog` in their path.
    expect(folders.items).toHaveLength(3);
  });

  it("types and status filter the answer", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    await seedSearchTree(payload);
    await payload.create({
      collection: "pages",
      data: { _status: "draft", slug: "year-plan", title: "Year plan" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });

    const pagesOnly = await search(request, { query: "year", scope: "all", types: ["pages"] });
    expect(pagesOnly.items.map((item) => item.collection)).toEqual(["pages", "pages"]);
    const drafts = await search(request, { query: "year", scope: "all", status: ["draft"] });
    expect(drafts.items.map((item) => item.title)).toEqual(["Year plan"]);
  });

  it("the endpoint takes q, folder, scope and types and answers items", async () => {
    const { payload } = harness;
    const tree = await seedSearchTree(payload);

    const found = await callEndpoint<{ items: TreeItem[] }>({
      config: harness.config,
      path: `/folders-tree/search?q=${encodeURIComponent('"new year"')}&folder=${tree.blog.id}&types=posts`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(found.status).toBe(200);
    expect(found.body.items.map((item) => item.fullPath)).toEqual([
      "/blog/2026/new-year",
      "/blog/2026/party",
    ]);
    for (const requestPath of [
      "/folders-tree/search",
      "/folders-tree/search?q=x&scope=sideways",
      "/folders-tree/search?q=x&types=unknown",
      "/folders-tree/search?q=x&status=nope",
    ]) {
      const refused = await callEndpoint<unknown>({
        config: harness.config,
        path: requestPath,
        payload,
        payloadInstanceCacheKey: harness.cacheKey,
      });
      expect(refused.status).toBe(400);
    }
  });
});

describe("GET /folders-tree/ancestors", () => {
  it("answers the folders above a page and above a folder, root first", async () => {
    const { payload } = harness;
    const tree = await seedSearchTree(payload);

    const page = await callEndpoint<{
      folders: Array<{ fullPath: string; id: number; name: string }>;
    }>({
      config: harness.config,
      path: `/folders-tree/ancestors?collection=posts&id=${tree.newYear.id}`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(page.status).toBe(200);
    expect(page.body.folders).toEqual([
      { fullPath: "/blog", id: tree.blog.id, name: "Blog" },
      { fullPath: "/blog/2026", id: tree.year.id, name: "2026" },
    ]);

    const folder = await callEndpoint<{ folders: Array<{ id: number }> }>({
      config: harness.config,
      path: `/folders-tree/ancestors?collection=folders&id=${tree.year.id}`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(folder.body.folders.map((entry) => entry.id)).toEqual([tree.blog.id]);

    const missing = await callEndpoint<unknown>({
      config: harness.config,
      path: "/folders-tree/ancestors?collection=posts&id=99999",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(missing.status).toBe(404);
  });
});

describe("tree reads and read access", () => {
  it("a collection the user cannot read contributes nothing, and its parent is a 404", async () => {
    const hostApp = await getTestPayload({
      foldersOptions: {
        folders: {
          // Drafters may not read folders at all.
          access: {
            read: ({ req }: { req: PayloadRequest }) =>
              (req.user as { role?: string } | null)?.role !== "drafter",
          },
        },
      },
    });
    try {
      const { payload } = hostApp;
      const folder = await createFolder(payload, { slug: "private" });
      await payload.create({
        collection: "pages",
        data: { _status: "published", slug: "inside", title: "Inside", folder: folder.id } as never,
        depth: 0,
        overrideAccess: true,
      });
      await payload.create({
        collection: "pages",
        data: { _status: "published", slug: "top", title: "Top" } as never,
        depth: 0,
        overrideAccess: true,
      });
      const drafter = await asUser(payload, "drafter");
      const admin = await asUser(payload, "admin");

      const asDrafter = await getChildren(drafter, { parent: null });
      const asAdmin = await getChildren(admin, { parent: null });

      expect(titles(asDrafter.items)).toEqual(["Top"]);
      expect(titles(asAdmin.items).sort()).toEqual(["Top", "private"]);
      await expect(getChildren(drafter, { parent: folder.id })).rejects.toMatchObject({
        status: 404,
      });
      expect(
        (await searchTree(drafter, { folder: null, query: "private", scope: "all" })).items
      ).toEqual([]);
    } finally {
      await hostApp.destroy();
    }
  });

  it("a page whose folder the user cannot read gets no invented path or depth", async () => {
    const hostApp = await getTestPayload({
      foldersOptions: {
        folders: {
          access: {
            read: ({ req }: { req: PayloadRequest }) =>
              (req.user as { role?: string } | null)?.role !== "drafter",
          },
        },
      },
    });
    try {
      const { payload } = hostApp;
      const folder = await createFolder(payload, { slug: "private" });
      await payload.create({
        collection: "pages",
        data: { _status: "published", slug: "inside", title: "Inside", folder: folder.id } as never,
        depth: 0,
        overrideAccess: true,
      });
      const drafter = await asUser(payload, "drafter");
      const admin = await asUser(payload, "admin");

      const { items } = await searchTree(drafter, { folder: null, query: "inside", scope: "all" });
      const asAdmin = await searchTree(admin, { folder: null, query: "inside", scope: "all" });

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ depth: null, fullPath: "", parentId: folder.id });
      // A page of unknown path sorts first instead of by an invented `/<segment>` among the root pages.
      await payload.create({
        collection: "pages",
        data: {
          _status: "published",
          folder: folder.id,
          slug: "zz-hidden",
          title: "Item hidden",
        } as never,
        depth: 0,
        overrideAccess: true,
      });
      await payload.create({
        collection: "pages",
        data: { _status: "published", slug: "aa-top", title: "Item top" } as never,
        depth: 0,
        overrideAccess: true,
      });
      const sorted = await searchTree(drafter, { folder: null, query: "item", scope: "all" });
      expect(titles(sorted.items)).toEqual(["Item hidden", "Item top"]);
      expect(items[0]).not.toHaveProperty("ancestorIds");
      // Whoever can read the folder gets the real values.
      expect(asAdmin.items[0]).toMatchObject({
        ancestorIds: `/${folder.id}/`,
        depth: 2,
        fullPath: "/private/inside",
      });
    } finally {
      await hostApp.destroy();
    }
  });
});

describe("tree reads and a read access that returns a Where", () => {
  const allowedFolderIds: number[] = [];

  it("children, search and child counts leave out the rows the Where excludes", async () => {
    const hostApp = await getTestPayload({
      extraCollections: [
        {
          slug: "notes",
          access: {
            read: ({ req }) => (req.user ? { folder: { in: allowedFolderIds } } : false),
          },
          fields: [
            { name: "title", type: "text" },
            { name: "slug", type: "text" },
          ],
        },
      ],
      foldersOptions: { collections: { notes: true } as never },
    });
    try {
      const { payload } = hostApp;
      const open = await createFolder(payload, { name: "Open", slug: "open" });
      const closed = await createFolder(payload, { name: "Closed", slug: "closed" });
      const note = (folder: number | null, title: string) =>
        payload.create({
          collection: "notes" as never,
          data: { folder, slug: title.toLowerCase().replaceAll(" ", "-"), title } as never,
          depth: 0,
          overrideAccess: true,
        });
      await note(open.id, "Open note");
      await note(closed.id, "Closed note");
      await note(closed.id, "Shared note");
      await note(null, "Root note");
      allowedFolderIds.push(open.id);
      const admin = await asUser(payload, "admin");

      const root = await getChildren(admin, { parent: null });
      const openChildren = await getChildren(admin, { parent: open.id });
      const closedChildren = await getChildren(admin, { parent: closed.id });
      const found = await searchTree(admin, { folder: null, query: "note", scope: "all" });

      // The folders stay (their own read access passes); the root note is outside the Where.
      expect(titles(root.items).sort()).toEqual(["Closed", "Open"]);
      expect(root.items.find((item) => item.id === open.id)?.childCount).toBe(1);
      expect(root.items.find((item) => item.id === closed.id)?.childCount).toBe(0);
      expect(titles(openChildren.items)).toEqual(["Open note"]);
      expect(closedChildren.items).toEqual([]);
      expect(titles(found.items)).toEqual(["Open note"]);
    } finally {
      await hostApp.destroy();
    }
  });

  it("100 rows across 2 collections cost 12 calls plus one per collection whose access is a Where", async () => {
    const hostApp = await getTestPayload({
      extraCollections: ["notes", "memos"].map((slug) => ({
        slug,
        access: { update: whereAccess },
        fields: [
          { name: "title", type: "text" as const },
          { name: "slug", type: "text" as const },
        ],
      })),
      foldersOptions: {
        collections: { memos: true, notes: true } as never,
        folders: { access: { update: whereAccess } },
      },
    });
    try {
      const { payload } = hostApp;
      const parent = await createFolder(payload, { slug: "bulk" });
      const keys = generateNKeysBetween(null, null, 100);
      for (let index = 0; index < 100; index += 1) {
        if (index < 10) {
          await createFolder(payload, {
            name: `Folder ${index}`,
            parent: parent.id,
            slug: `f-${index}`,
          });
          continue;
        }
        await payload.create({
          collection: (index % 2 === 0 ? "notes" : "memos") as never,
          context: { foldersInternal: true },
          data: {
            folder: parent.id,
            orderKey: keys[index],
            pathSegment: `row-${index}`,
            slug: `row-${index}`,
            structureRevision: 0,
            title: `Row ${index}`,
          } as never,
          depth: 0,
          overrideAccess: true,
        });
      }
      const admin = await asUser(payload, "admin");

      const { reads, result } = await countDbReads(payload, () =>
        getChildren(admin, { limit: 100, parent: parent.id })
      );

      expect(result.items).toHaveLength(100);
      // Folders, notes and memos each answer `update` with a Where: update and publish share it,
      // so one match query per collection. That is 3 on top of the 12 of a user whose access is `true`.
      expect(reads).toBeLessThanOrEqual(12 + 3);
      expect(result.items.every((item) => item.access.update)).toBe(true);
    } finally {
      await hostApp.destroy();
    }
  });
});

describe("search candidates and status", () => {
  it("says so when a collection has more candidates than it reads", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    for (const slug of ["aaa-1", "aaa-2", "aaa-3"]) {
      await makePage(payload, slug);
    }

    const cut = await search(request, { query: "item", scope: "all" }, { candidateLimit: 2 });
    const exact = await search(request, { query: "item", scope: "all" }, { candidateLimit: 3 });
    const normal = await search(request, { query: "item", scope: "all" });

    expect(cut.truncated).toBe(true);
    expect(cut.items).toHaveLength(2);
    // Exactly as many matches as the cap is not a cut.
    expect(exact.truncated).toBe(false);
    expect(exact.items).toHaveLength(3);
    expect(normal.truncated).toBe(false);
  });

  it("a status filter narrows the query, so the candidate cap is spent on matching pages", async () => {
    const { payload } = harness;
    const request = await asUser(payload, "admin");
    for (const slug of ["aaa-1", "aaa-2", "aaa-3"]) {
      await makePage(payload, slug);
    }
    await makePage(payload, "zzz-draft", "draft");
    await payload.create({
      collection: "posts",
      data: { slug: "aaa-post", title: "Item aaa-post" },
      depth: 0,
      overrideAccess: true,
    });

    const drafts = await countDbCalls(payload, () =>
      search(request, { query: "item", scope: "all", status: ["draft"] }, { candidateLimit: 2 })
    );
    const published = await search(
      request,
      { query: "item", scope: "all", status: ["published"] },
      { candidateLimit: 2 }
    );
    const live = await search(request, { query: "item", scope: "all", status: ["live"] });

    // Sorted by path the draft comes last: without the narrowing the cap would never reach it.
    expect(titles(drafts.result.items)).toEqual(["Item zzz-draft"]);
    expect(drafts.result.truncated).toBe(false);
    expect(drafts.calls.some((call) => ["folders", "posts"].includes(call.collection))).toBe(false);
    expect(published.items).toHaveLength(2);
    expect(published.truncated).toBe(true);
    // Posts have no drafts: `live` is theirs alone, and pages are not even asked.
    expect(titles(live.items)).toEqual(["Item aaa-post"]);
  });
});
