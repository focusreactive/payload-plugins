import { generateKeyBetween } from "payload/shared";
import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { MoveBlockedError, planMove } from "../../src/core/move.js";
import type { MoveRequest } from "../../src/core/move.js";
import { isTreeLockHeld } from "../../src/core/treeLock.js";
import { countDbCalls } from "../helpers/countDbCalls.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

let harness: TestPayload;
let relaxedHarness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  // A second app with other options: planMove reads the options of the Payload instance it is given.
  relaxedHarness = await getTestPayload({
    foldersOptions: {
      enforceAllowedTypesOnMove: false,
      limits: { maxFoldersPerMove: 3 },
      redirects: { mirrorToRedirectsPlugin: true },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
  await relaxedHarness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
  await clearTree(relaxedHarness.payload);
});

const folderRef = (id: number) => ({ collection: "folders", id });
const pageRef = (id: number) => ({ collection: "pages", id });
const postRef = (id: number) => ({ collection: "posts", id });

const plan = async (payload: Payload, request: MoveRequest) =>
  planMove(await createTestRequest(payload), request);

/** Posts written without the plugin's hooks: each carries a slug and a key, which is all the tree reads. */
const createPostsInside = async (payload: Payload, folderId: number, count: number) => {
  const posts: Array<{ id: number }> = [];
  for (let index = 1; index <= count; index += 1) {
    posts.push(
      (await payload.create({
        collection: "posts",
        context: { foldersInternal: true },
        data: {
          folder: folderId,
          orderKey: `a${String(index).padStart(3, "0")}`,
          slug: `entry-${index}`,
          structureRevision: 0,
          title: `Entry ${index}`,
        },
        depth: 0,
        overrideAccess: true,
      })) as unknown as { id: number }
    );
  }

  return posts;
};

const createPublishedPage = async (
  payload: Payload,
  data: {
    deSlug?: string;
    folder: number | null;
    isFolderRoot?: boolean;
    slug: string;
    title: string;
  }
): Promise<{ id: number }> => {
  const page = await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: data.folder,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.title,
    } as never,
    depth: 0,
    overrideAccess: true,
  });
  if (data.deSlug) {
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: data.deSlug, title: data.title } as never,
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
  }

  return page as unknown as { id: number };
};

describe("move planner", () => {
  it("counts URL changes for a folder with 40 pages in 2 locales", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
    const archive = await createFolder(payload, { name: "Archive", slug: "archive" });
    // The German path of the folder differs, so both locales have their own change to report.
    await payload.update({
      collection: "folders",
      data: { name: "Archiv", slug: "archiv" },
      id: archive.id,
      locale: "de",
      overrideAccess: true,
    });
    await createPostsInside(payload, archive.id, 40);
    await payload.create({
      collection: "pages",
      data: {
        _status: "draft",
        folder: archive.id,
        slug: "unpublished",
        title: "Unpublished",
      } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });

    const preview = await plan(payload, {
      items: [folderRef(archive.id)],
      toFolder: blog.id,
    });

    expect(preview.ok).toBe(true);
    expect(preview.blocked).toEqual([]);
    expect(preview.urlChanges).toEqual({
      draftOnly: 1,
      published: 40,
      publishedAcrossLocales: 80,
    });
    // One folderPrefix row per locale whose folder path changes; no row per page.
    expect(preview.redirectRowsToWrite).toBe(2);
    expect(preview.mirrorRowsToWrite).toBe(0);
    expect(preview.samples).toHaveLength(5);
    for (const sample of preview.samples) {
      expect(sample.collection).toBe("posts");
      expect(sample.from.startsWith("/archive") || sample.from.startsWith("/archiv")).toBe(true);
      expect(sample.to).toBe(`/blog${sample.from}`);
    }
    expect(preview.droppedItems).toEqual([]);

    const withoutRedirects = await plan(payload, {
      items: [folderRef(archive.id)],
      redirects: false,
      toFolder: blog.id,
    });
    expect(withoutRedirects.redirectRowsToWrite).toBe(0);
    expect(withoutRedirects.urlChanges).toEqual(preview.urlChanges);
  });

  it("counts the mirror rows one per published page path when the mirror is on", async () => {
    const { payload } = relaxedHarness;
    const blog = await createFolder(payload, { slug: "blog" });
    const archive = await createFolder(payload, { slug: "archive" });
    await createPostsInside(payload, archive.id, 5);

    const preview = await plan(payload, { items: [folderRef(archive.id)], toFolder: blog.id });

    expect(preview.mirrorRowsToWrite).toBe(10);
  });

  it("counts a moved page's own URL, and none for a reorder inside its folder", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await createPublishedPage(payload, {
      deSlug: "hallo",
      folder: null,
      slug: "hello",
      title: "Hello",
    });

    const moved = await plan(payload, { items: [pageRef(page.id)], toFolder: news.id });
    expect(moved.urlChanges).toEqual({ draftOnly: 0, published: 1, publishedAcrossLocales: 2 });
    expect(moved.redirectRowsToWrite).toBe(2);
    expect(moved.samples).toEqual(
      expect.arrayContaining([
        { collection: "pages", from: "/hello", id: page.id, locale: "en", to: "/news/hello" },
        { collection: "pages", from: "/hallo", id: page.id, locale: "de", to: "/news/hallo" },
      ])
    );

    const reorder = await plan(payload, { items: [pageRef(page.id)], toFolder: null });
    expect(reorder.ok).toBe(true);
    expect(reorder.urlChanges).toEqual({ draftOnly: 0, published: 0, publishedAcrossLocales: 0 });
    expect(reorder.redirectRowsToWrite).toBe(0);
    expect(reorder.samples).toEqual([]);
  });

  it("drops a page whose folder is also selected", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const outer = await createFolder(payload, { slug: "outer" });
    const inner = await createFolder(payload, { parent: outer.id, slug: "inner" });
    const direct = await createPage(payload, { folder: outer.id, slug: "direct" });
    const deep = await createPage(payload, { folder: inner.id, slug: "deep" });
    const separate = await createPage(payload, { slug: "separate" });

    const preview = await plan(payload, {
      items: [pageRef(direct.id), folderRef(outer.id), pageRef(deep.id), pageRef(separate.id)],
      toFolder: target.id,
    });

    expect(preview.ok).toBe(true);
    expect(preview.droppedItems).toEqual([pageRef(direct.id), pageRef(deep.id)]);
    expect(Object.keys(preview.orderKeys).sort()).toEqual(
      [`folders:${outer.id}`, `pages:${separate.id}`].sort()
    );
  });

  it("blocks a cycle", async () => {
    const { payload } = harness;
    const top = await createFolder(payload, { slug: "top" });
    const child = await createFolder(payload, { parent: top.id, slug: "child" });
    const grandchild = await createFolder(payload, { parent: child.id, slug: "grandchild" });

    const intoDescendant = await plan(payload, {
      items: [folderRef(top.id)],
      toFolder: grandchild.id,
    });
    const intoItself = await plan(payload, { items: [folderRef(top.id)], toFolder: top.id });
    const afterDescendant = await plan(payload, {
      after: folderRef(grandchild.id),
      items: [folderRef(top.id)],
    });

    for (const preview of [intoDescendant, intoItself, afterDescendant]) {
      expect(preview.ok).toBe(false);
      expect(preview.blocked).toEqual([
        {
          item: folderRef(top.id),
          message: "A folder cannot be moved into itself or one of its subfolders",
          reason: "cycle",
        },
      ]);
    }
  });

  it("blocks the twenty-first level", async () => {
    const { payload } = harness;
    let parent: number | null = null;
    const chain: number[] = [];
    for (let level = 1; level <= 20; level += 1) {
      const folder = await createFolder(payload, { parent, slug: `level-${level}` });
      chain.push(folder.id);
      parent = folder.id;
    }
    const loose = await createFolder(payload, { slug: "loose" });
    const loosePage = await createPage(payload, { folder: loose.id, slug: "inside-loose" });
    const page = await createPage(payload, { slug: "alone" });
    const depthMessage = "This would make URLs 21 segments deep; the limit is 20";

    // A folder at level 20 holds folders and pages only at level 21.
    const folderIntoTwentieth = await plan(payload, {
      items: [folderRef(loose.id)],
      toFolder: chain[19],
    });
    const pageIntoTwentieth = await plan(payload, {
      items: [pageRef(page.id)],
      toFolder: chain[19],
    });
    // A folder may land on level 20, but its page then sits on level 21.
    const folderWithPageIntoNineteenth = await plan(payload, {
      items: [folderRef(loose.id)],
      toFolder: chain[18],
    });

    expect(folderIntoTwentieth.blocked).toEqual([
      { item: folderRef(loose.id), message: depthMessage, reason: "depth" },
    ]);
    expect(pageIntoTwentieth.blocked).toEqual([
      { item: pageRef(page.id), message: depthMessage, reason: "depth" },
    ]);
    expect(folderWithPageIntoNineteenth.blocked).toEqual([
      { item: folderRef(loose.id), message: depthMessage, reason: "depth" },
    ]);

    // The same folder without its page fits on level 20, and the page fits in level 19's folder.
    await payload.db.deleteMany({ collection: "pages", where: { id: { equals: loosePage.id } } });
    const emptyFolder = await plan(payload, { items: [folderRef(loose.id)], toFolder: chain[18] });
    const pageIntoNineteenth = await plan(payload, {
      items: [pageRef(page.id)],
      toFolder: chain[18],
    });
    expect(emptyFolder.ok).toBe(true);
    expect(pageIntoNineteenth.ok).toBe(true);
  });

  it("blocks a segment conflict and names the item and locale", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const news = await createFolder(payload, { slug: "news" });
    const moving = await createPublishedPage(payload, {
      deSlug: "gemeinsam",
      folder: source.id,
      slug: "intro",
      title: "Introduction",
    });
    // The two pages differ in English and share their German segment.
    await createPublishedPage(payload, {
      deSlug: "gemeinsam",
      folder: news.id,
      slug: "other",
      title: "Existing page",
    });

    const preview = await plan(payload, { items: [pageRef(moving.id)], toFolder: news.id });

    expect(preview.ok).toBe(false);
    expect(preview.blocked).toHaveLength(1);
    const [conflict] = preview.blocked;
    expect(conflict).toMatchObject({ item: pageRef(moving.id), locale: "de", reason: "conflict" });
    expect(conflict.message).toContain("Introduction");
    expect(conflict.message).toContain("Existing page");
    expect(conflict.message).toContain("/news/gemeinsam");
    expect(conflict.message).toMatch(/ in de$/u);
  });

  it("blocks a folder whose segment a page or folder in the target already uses", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    await createPublishedPage(payload, {
      folder: target.id,
      slug: "docs",
      title: "Docs page",
    });
    await createFolder(payload, { parent: target.id, slug: "guides" });
    const docsFolder = await createFolder(payload, { slug: "docs" });
    const guidesFolder = await createFolder(payload, { slug: "guides" });

    const byPage = await plan(payload, { items: [folderRef(docsFolder.id)], toFolder: target.id });
    const byFolder = await plan(payload, {
      items: [folderRef(guidesFolder.id)],
      toFolder: target.id,
    });

    expect(byPage.blocked[0]).toMatchObject({ item: folderRef(docsFolder.id), reason: "conflict" });
    expect(byFolder.blocked[0]).toMatchObject({
      item: folderRef(guidesFolder.id),
      reason: "conflict",
    });
  });

  it("blocks two selected items that would share a segment in the target", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const first = await createPage(payload, { slug: "same" });
    const otherFolder = await createFolder(payload, { slug: "elsewhere" });
    const second = await createPage(payload, { folder: otherFolder.id, slug: "same" });

    const preview = await plan(payload, {
      items: [pageRef(first.id), pageRef(second.id)],
      toFolder: target.id,
    });

    expect(preview.ok).toBe(false);
    expect(preview.blocked).toHaveLength(1);
    expect(preview.blocked[0]).toMatchObject({ item: pageRef(second.id), reason: "conflict" });
  });

  it("blocks a root page into a folder that has one", async () => {
    const { payload } = harness;
    const company = await createFolder(payload, { slug: "company" });
    const team = await createFolder(payload, { slug: "team" });
    const companyRoot = await createPublishedPage(payload, {
      folder: company.id,
      isFolderRoot: true,
      slug: "company-home",
      title: "Company home",
    });
    const teamRoot = await createPublishedPage(payload, {
      folder: team.id,
      isFolderRoot: true,
      slug: "team-home",
      title: "Team home",
    });

    const preview = await plan(payload, { items: [pageRef(teamRoot.id)], toFolder: company.id });

    expect(preview.ok).toBe(false);
    expect(preview.blocked).toHaveLength(1);
    expect(preview.blocked[0]).toMatchObject({ item: pageRef(teamRoot.id), reason: "rootPage" });
    expect(preview.blocked[0].message).toContain(
      "Company home is already the root page of /company"
    );

    // Moving it into a folder without one is fine, and a reorder in its own folder is too.
    const empty = await createFolder(payload, { slug: "empty" });
    expect((await plan(payload, { items: [pageRef(teamRoot.id)], toFolder: empty.id })).ok).toBe(
      true
    );
    expect(
      (await plan(payload, { items: [pageRef(companyRoot.id)], toFolder: company.id })).ok
    ).toBe(true);
  });

  it("blocks a root page into the site root when it already has one", async () => {
    const { payload } = harness;
    const team = await createFolder(payload, { slug: "team" });
    await createPublishedPage(payload, {
      folder: null,
      isFolderRoot: true,
      slug: "home",
      title: "Home",
    });
    const teamRoot = await createPublishedPage(payload, {
      folder: team.id,
      isFolderRoot: true,
      slug: "team-home",
      title: "Team home",
    });

    const preview = await plan(payload, { items: [pageRef(teamRoot.id)], toFolder: null });

    expect(preview.blocked).toHaveLength(1);
    expect(preview.blocked[0]).toMatchObject({ item: pageRef(teamRoot.id), reason: "rootPage" });
    expect(preview.blocked[0].message).toContain("Home is already the root page of /");
  });

  it("blocks two root pages moving into one folder", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const one = await createFolder(payload, { slug: "one" });
    const two = await createFolder(payload, { slug: "two" });
    const rootOne = await createPublishedPage(payload, {
      folder: one.id,
      isFolderRoot: true,
      slug: "root-one",
      title: "Root one",
    });
    const rootTwo = await createPublishedPage(payload, {
      folder: two.id,
      isFolderRoot: true,
      slug: "root-two",
      title: "Root two",
    });

    const preview = await plan(payload, {
      items: [pageRef(rootOne.id), pageRef(rootTwo.id)],
      toFolder: target.id,
    });

    expect(preview.blocked).toHaveLength(1);
    expect(preview.blocked[0]).toMatchObject({ item: pageRef(rootTwo.id), reason: "rootPage" });
    expect(preview.blocked[0].message).toContain("Root one");
  });

  it("blocks a root-level segment the site itself uses", async () => {
    const { payload } = harness;
    const holder = await createFolder(payload, { slug: "holder" });
    const api = await createFolder(payload, { parent: holder.id, slug: "api" });
    const page = await createPage(payload, { folder: holder.id, slug: "admin" });

    const folderPreview = await plan(payload, { items: [folderRef(api.id)], toFolder: null });
    const pagePreview = await plan(payload, { items: [pageRef(page.id)], toFolder: null });

    expect(folderPreview.blocked).toEqual([
      { item: folderRef(api.id), message: "/api is used by the site itself", reason: "reserved" },
    ]);
    expect(pagePreview.blocked).toEqual([
      { item: pageRef(page.id), message: "/admin is used by the site itself", reason: "reserved" },
    ]);
  });

  it("blocks a type the target refuses, including a page inside a moved folder", async () => {
    const { payload } = harness;
    const articles = await createFolder(payload, { slug: "articles" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["posts"] },
      id: articles.id,
      overrideAccess: true,
    });
    const page = await createPage(payload, { slug: "a-page" });
    const holder = await createFolder(payload, { slug: "holder" });
    await createPage(payload, { folder: holder.id, slug: "hidden-page" });
    const post = await createPostsInside(payload, holder.id, 1);

    const pagePreview = await plan(payload, { items: [pageRef(page.id)], toFolder: articles.id });
    const folderPreview = await plan(payload, {
      items: [folderRef(holder.id), postRef(post[0].id)],
      toFolder: articles.id,
    });

    expect(pagePreview.ok).toBe(false);
    expect(pagePreview.blocked).toEqual([
      {
        item: pageRef(page.id),
        message: "/articles accepts only Blog post pages",
        reason: "type",
      },
    ]);
    expect(folderPreview.blocked).toHaveLength(1);
    expect(folderPreview.blocked[0]).toMatchObject({ item: folderRef(holder.id), reason: "type" });
    // The post is dropped with its folder, not blocked on its own.
    expect(folderPreview.droppedItems).toEqual([postRef(post[0].id)]);
  });

  it("warns instead of blocking a type with the option off", async () => {
    const { payload } = relaxedHarness;
    const articles = await createFolder(payload, { slug: "articles" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["posts"] },
      id: articles.id,
      overrideAccess: true,
    });
    const page = await createPage(payload, { slug: "a-page" });

    const preview = await plan(payload, { items: [pageRef(page.id)], toFolder: articles.id });

    expect(preview.ok).toBe(true);
    expect(preview.blocked).toEqual([]);
    expect(preview.warnings).toEqual([
      {
        item: pageRef(page.id),
        message: "/articles accepts only Blog post pages",
        reason: "type",
      },
    ]);
  });

  it("refuses 501 items", async () => {
    const { payload } = harness;
    const items = Array.from({ length: 501 }, (_, index) => pageRef(index + 1));

    const preview = await plan(payload, { items, toFolder: null });

    expect(preview.ok).toBe(false);
    expect(preview.blocked).toEqual([
      { item: pageRef(501), message: "Move at most 500 items at once", reason: "size" },
    ]);
    // Exactly the limit is not refused for its size.
    const atLimit = await plan(payload, { items: items.slice(0, 500), toFolder: null });
    expect(atLimit.blocked.some((entry) => entry.reason === "size")).toBe(false);
  });

  it("refuses a move that would rewrite more folders than the limit", async () => {
    const { payload } = relaxedHarness;
    const top = await createFolder(payload, { slug: "top" });
    for (const slug of ["one", "two", "three"]) {
      await createFolder(payload, { parent: top.id, slug });
    }
    const target = await createFolder(payload, { slug: "target" });

    const preview = await plan(payload, { items: [folderRef(top.id)], toFolder: target.id });

    expect(preview.blocked).toEqual([
      {
        item: folderRef(top.id),
        message: "This move would rewrite 4 folders; the limit is 3",
        reason: "size",
      },
    ]);
  });

  it("reports stale when expected parent differs", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const other = await createFolder(payload, { slug: "other" });
    const target = await createFolder(payload, { slug: "target" });
    const page = await createPage(payload, { folder: source.id, slug: "page" });
    const storedKey = (page as unknown as { orderKey: string }).orderKey;
    const staleMessage = "This part of the tree changed. Reload and try again.";

    const parentDiffers = await plan(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: storedKey, parentId: other.id } }],
      toFolder: target.id,
    });
    const orderKeyDiffers = await plan(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: "zz", parentId: source.id } }],
      toFolder: target.id,
    });
    const current = await plan(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: storedKey, parentId: source.id } }],
      toFolder: target.id,
    });

    for (const preview of [parentDiffers, orderKeyDiffers]) {
      expect(preview.ok).toBe(false);
      expect(preview.blocked).toEqual([
        { item: pageRef(page.id), message: staleMessage, reason: "stale" },
      ]);
    }
    expect(current.ok).toBe(true);
  });

  it("reports stale when an item or the target no longer exists", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const page = await createPage(payload, { slug: "page" });

    const missingItem = await plan(payload, { items: [pageRef(999_999)], toFolder: target.id });
    const missingTarget = await plan(payload, { items: [pageRef(page.id)], toFolder: 999_999 });
    const missingSibling = await plan(payload, {
      after: pageRef(999_999),
      items: [pageRef(page.id)],
    });

    for (const preview of [missingItem, missingTarget, missingSibling]) {
      expect(preview.ok).toBe(false);
      expect(preview.blocked).toHaveLength(1);
      expect(preview.blocked[0].reason).toBe("stale");
    }
  });

  it("plans the order keys of the target gap in the given order, without writing", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const first = await createPage(payload, { folder: target.id, slug: "first" });
    const second = await createPage(payload, { folder: target.id, slug: "second" });
    const loose = await Promise.all(
      ["c", "a", "b"].map((slug) => createPage(payload, { slug: `loose-${slug}` }))
    );
    const siblings = (await payload.find({
      collection: "pages",
      depth: 0,
      overrideAccess: true,
      sort: "orderKey",
      where: { folder: { equals: target.id } },
    })) as unknown as { docs: Array<{ id: number; orderKey: string }> };
    const [top, bottom] = siblings.docs;
    expect([top.id, bottom.id].sort()).toEqual([first.id, second.id].sort());

    const { result: preview, writes } = await countDbWrites(payload, () =>
      plan(payload, {
        after: pageRef(top.id),
        items: loose.map((page) => pageRef(page.id)),
      })
    );

    expect(writes).toEqual([]);
    expect(preview.targetFolderId).toBe(target.id);
    const keys = loose.map((page) => preview.orderKeys[`pages:${page.id}`]);
    expect(keys.every((key) => typeof key === "string")).toBe(true);
    // Strictly ascending in the given order, and inside the gap after `top`.
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0] > top.orderKey).toBe(true);
    expect(keys[2] < bottom.orderKey).toBe(true);

    const atStart = await plan(payload, { items: [pageRef(loose[0].id)], toFolder: target.id });
    expect(atStart.orderKeys[`pages:${loose[0].id}`] < top.orderKey).toBe(true);
    const atEnd = await plan(payload, {
      items: [pageRef(loose[0].id)],
      position: "end",
      toFolder: target.id,
    });
    expect(atEnd.orderKeys[`pages:${loose[0].id}`] > bottom.orderKey).toBe(true);
    expect(generateKeyBetween(top.orderKey, bottom.orderKey)).toBeTruthy();
  });

  it("blocks a dotted segment from moving to the site root, for a page and for a folder", async () => {
    const { payload } = harness;
    const feeds = await createFolder(payload, { slug: "feeds" });
    const feed = await payload.create({
      collection: "posts",
      data: { folder: feeds.id, slug: "feed.xml", title: "Feed" },
      depth: 0,
      overrideAccess: true,
    });
    const versioned = await createFolder(payload, { parent: feeds.id, slug: "data.v2" });
    const other = await createFolder(payload, { slug: "other" });

    const pagePreview = await plan(payload, { items: [postRef(feed.id)], toFolder: null });
    const folderPreview = await plan(payload, { items: [folderRef(versioned.id)], toFolder: null });

    expect(pagePreview.ok).toBe(false);
    expect(pagePreview.blocked).toEqual([
      {
        item: postRef(feed.id),
        message: "/feed.xml cannot be at the top level: a top-level segment cannot contain a dot",
        reason: "reserved",
      },
    ]);
    expect(folderPreview.blocked).toEqual([
      {
        item: folderRef(versioned.id),
        message: "/data.v2 cannot be at the top level: a top-level segment cannot contain a dot",
        reason: "reserved",
      },
    ]);
    // A dot is fine below a folder.
    expect((await plan(payload, { items: [postRef(feed.id)], toFolder: other.id })).ok).toBe(true);
    expect((await plan(payload, { items: [folderRef(versioned.id)], toFolder: other.id })).ok).toBe(
      true
    );
  });

  it("counts only published pages as a segment conflict", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const mover = await createPublishedPage(payload, {
      folder: null,
      slug: "same",
      title: "Mover",
    });
    // Saved as a draft and never published: a save would allow a second `same`, so a move does too.
    const draftOnly = await createPage(payload, { folder: target.id, slug: "same" });

    const draftPreview = await plan(payload, { items: [pageRef(mover.id)], toFolder: target.id });

    expect(draftPreview.ok).toBe(true);
    expect(draftPreview.blocked).toEqual([]);

    await payload.update({
      collection: "pages",
      data: { _status: "published" } as never,
      depth: 0,
      id: draftOnly.id,
      overrideAccess: true,
    });
    const publishedPreview = await plan(payload, {
      items: [pageRef(mover.id)],
      toFolder: target.id,
    });

    expect(publishedPreview.ok).toBe(false);
    expect(publishedPreview.blocked[0]).toMatchObject({
      item: pageRef(mover.id),
      reason: "conflict",
    });
  });

  it("blocks every refused item past the sample limit of 20", async () => {
    const { payload } = harness;
    const articles = await createFolder(payload, { slug: "articles" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["pages"] },
      id: articles.id,
      overrideAccess: true,
    });
    const source = await createFolder(payload, { slug: "source" });
    const posts = await createPostsInside(payload, source.id, 22);

    const preview = await plan(payload, {
      items: posts.map((post) => postRef(post.id)),
      toFolder: articles.id,
    });

    expect(preview.ok).toBe(false);
    expect(preview.blocked).toHaveLength(22);
    expect(preview.blocked.every((entry) => entry.reason === "type")).toBe(true);
    expect(new Set(preview.blocked.map((entry) => entry.item.id)).size).toBe(22);
  });

  it("warns for every refused item past the sample limit of 20 with the option off", async () => {
    const { payload } = relaxedHarness;
    const articles = await createFolder(payload, { slug: "articles" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["pages"] },
      id: articles.id,
      overrideAccess: true,
    });
    const source = await createFolder(payload, { slug: "source" });
    const posts = await createPostsInside(payload, source.id, 22);

    const preview = await plan(payload, {
      items: posts.map((post) => postRef(post.id)),
      toFolder: articles.id,
    });

    expect(preview.ok).toBe(true);
    expect(preview.warnings).toHaveLength(22);
    expect(new Set(preview.warnings.map((entry) => entry.item.id)).size).toBe(22);
  });

  it("counts every moved folder that holds refused pages, past the sample limit", async () => {
    const { payload } = harness;
    const articles = await createFolder(payload, { slug: "articles" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["pages"] },
      id: articles.id,
      overrideAccess: true,
    });
    const holders: number[] = [];
    for (let index = 1; index <= 22; index += 1) {
      const holder = await createFolder(payload, { slug: `holder-${index}` });
      await createPostsInside(payload, holder.id, 1);
      holders.push(holder.id);
    }

    const preview = await plan(payload, {
      items: holders.map(folderRef),
      toFolder: articles.id,
    });

    expect(preview.blocked).toHaveLength(22);
    expect(preview.blocked.every((entry) => entry.reason === "type")).toBe(true);
  });

  it("reads a bounded number of rows for a 100-item preview, however many items move", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const target = await createFolder(payload, { slug: "target" });
    await createPage(payload, { folder: target.id, slug: "resident" });
    const posts = await createPostsInside(payload, source.id, 100);
    const movePosts = (count: number) =>
      plan(payload, {
        items: posts.slice(0, count).map((post) => postRef(post.id)),
        toFolder: target.id,
      });

    const small = await countDbCalls(payload, () => movePosts(10));
    const large = await countDbCalls(payload, () => movePosts(100));

    expect(small.result.ok).toBe(true);
    expect(large.result.ok).toBe(true);
    expect(large.calls.length).toBeLessThan(30);
    // Flat in the number of items: the old per-item check read about six rows per item per locale.
    expect(large.calls.length).toBe(small.calls.length);
  });

  it("names the other item and the locale in every conflict of a batch", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    await createFolder(payload, { parent: target.id, slug: "taken-by-folder" });
    await createPublishedPage(payload, {
      deSlug: "belegt",
      folder: target.id,
      slug: "taken-by-page",
      title: "Resident",
    });
    const movers = await Promise.all(
      [
        { deSlug: undefined, slug: "taken-by-folder" },
        { deSlug: "belegt", slug: "elsewhere" },
        { deSlug: undefined, slug: "free" },
      ].map(({ deSlug, slug }) =>
        createPublishedPage(payload, { deSlug, folder: null, slug, title: `Mover ${slug}` })
      )
    );

    const preview = await plan(payload, {
      items: movers.map((mover) => pageRef(mover.id)),
      toFolder: target.id,
    });

    expect(preview.blocked.map((entry) => entry.item)).toEqual([
      pageRef(movers[0].id),
      pageRef(movers[1].id),
    ]);
    expect(preview.blocked[0]).toMatchObject({ locale: "en", reason: "conflict" });
    expect(preview.blocked[0].message).toBe(
      '"Mover taken-by-folder" cannot move to /target: /target/taken-by-folder is already used by a folder in en'
    );
    expect(preview.blocked[1]).toMatchObject({ locale: "de", reason: "conflict" });
    expect(preview.blocked[1].message).toBe(
      '"Mover elsewhere" cannot move to /target: /target/belegt is already used by Resident in de'
    );
  });

  it("refuses a request that names no target or both, or an unknown collection", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "page" });
    const request = await createTestRequest(payload);

    await expect(planMove(request, { items: [], toFolder: null })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      planMove(request, { items: [pageRef(page.id)] } as unknown as MoveRequest)
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      planMove(request, {
        after: pageRef(page.id),
        items: [pageRef(page.id)],
        toFolder: null,
      } as unknown as MoveRequest)
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      planMove(request, { items: [{ collection: "users", id: 1 }], toFolder: null })
    ).rejects.toMatchObject({ status: 400 });
    expect(isTreeLockHeld(payload)).toBe(false);
    expect(new MoveBlockedError([{ item: pageRef(1), message: "x", reason: "stale" }]).status).toBe(
      409
    );
  });
});
