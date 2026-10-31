import { initTransaction, killTransaction } from "payload";
import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { findRedirect, moveItems, planMove } from "../../src/server/index.js";
import { countDbReads } from "../helpers/countDbReads.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

/** Setup that changes URLs writes rows of its own; a test that counts rows starts after it. */
const forgetRows = (payload: Payload): Promise<void> =>
  payload.db.deleteMany({ collection: "folder-redirects", where: { id: { exists: true } } });

afterEach(async () => {
  await forgetRows(harness.payload);
  await clearTree(harness.payload);
});

const folderRef = (id: number) => ({ collection: "folders", id });
const pageRef = (id: number) => ({ collection: "pages", id });

type RedirectSummary = { kind: string; lookupKey: string; target: string };

/** Every row as `lookupKey`, `kind` and `collection:id` of the target, sorted by key. */
const readRows = async (payload: Payload): Promise<RedirectSummary[]> => {
  const { docs } = await payload.find({
    collection: "folder-redirects",
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
  });

  return docs
    .map((doc) => {
      const target = doc.target as { relationTo: string; value: number | { id: number } };
      const value = typeof target.value === "object" ? target.value.id : target.value;

      return { kind: doc.kind, lookupKey: doc.lookupKey, target: `${target.relationTo}:${value}` };
    })
    .sort((left, right) => left.lookupKey.localeCompare(right.lookupKey));
};

const publishedPage = async (
  payload: Payload,
  data: { deSlug?: string; folder?: number | null; isFolderRoot?: boolean; slug: string }
): Promise<{ id: number }> => {
  const page = await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: data.folder ?? null,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.slug,
    } as never,
    depth: 0,
    overrideAccess: true,
  });
  if (data.deSlug) {
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: data.deSlug, title: data.slug } as never,
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
  }

  return page as unknown as { id: number };
};

const renameFolder = (
  payload: Payload,
  id: number,
  slug: string,
  locale: "de" | "en" = "en",
  context: Record<string, unknown> = {}
) =>
  payload.update({
    collection: "folders",
    context,
    data: { slug },
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  });

describe("redirect rows on a folder rename", () => {
  it("a folder rename writes one folderPrefix row", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    // A German slug of its own keeps the German path out of this rename, so one locale changes.
    await renameFolder(payload, tree.about.id, "ueber-uns", "de");
    await forgetRows(payload);

    await renameFolder(payload, tree.about.id, "company");

    // contact, the root page and the post are live beneath: still one row, not one per page.
    expect(await readRows(payload)).toEqual([
      { kind: "folderPrefix", lookupKey: "en:/about", target: `folders:${tree.about.id}` },
    ]);
  });

  it("a rename writes a row for a locale served through fallback", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "guides" });
    // Published in en only (no post, which is live in every locale): de reads it through the
    // fallback (decision 24), so its de URL changes too.
    await publishedPage(payload, { folder: folder.id, slug: "intro" });

    await renameFolder(payload, folder.id, "manuals");

    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual([
      "de:/guides",
      "en:/guides",
    ]);
  });

  it("/about/contact redirects to /company/contact", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await renameFolder(payload, tree.about.id, "company");

    const english = await findRedirect(payload, { locale: "en", path: "/about/contact" });
    const german = await findRedirect(payload, { locale: "de", path: "/about/contact" });

    expect(english).toMatchObject({ status: 301, to: "/company/contact" });
    expect(german).toMatchObject({ status: 301, to: "/company/contact" });
    // The folder's own old URL, and a path with a longer remainder, follow the same row.
    expect(await findRedirect(payload, { locale: "en", path: "/about" })).toMatchObject({
      to: "/company",
    });
    expect(
      await findRedirect(payload, { locale: "en", path: "/about/team/members" })
    ).toMatchObject({ to: "/company/team/members" });
    expect(await findRedirect(payload, { locale: "en", path: "/nowhere/contact" })).toBeNull();
  });

  it("lookup uses at most 2 queries", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await renameFolder(payload, tree.about.id, "company");

    const { reads, result } = await countDbReads(payload, () =>
      findRedirect(payload, { locale: "en", path: "/about/contact" })
    );

    expect(result).toMatchObject({ hops: 1, to: "/company/contact" });
    // One for the rows of the path and its prefixes, one for the folder's current path.
    expect(reads).toBe(2);
    const { reads: missReads } = await countDbReads(payload, () =>
      findRedirect(payload, { locale: "en", path: "/nowhere/page" })
    );
    expect(missReads).toBe(1);
  });

  it("a rename of a folder with drafts only writes no row", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "drafts" });
    await createPage(payload, { folder: folder.id, slug: "idea" });

    await renameFolder(payload, folder.id, "ideas");

    expect(await readRows(payload)).toEqual([]);
  });
});

describe("redirect rows on a move", () => {
  it("a page moved twice redirects straight to its last path", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const archive = await createFolder(payload, { slug: "archive" });
    const page = await publishedPage(payload, { slug: "hello" });

    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: archive.id,
    });

    const { reads, result: fromFirstPath } = await countDbReads(payload, () =>
      findRedirect(payload, { locale: "en", path: "/hello" })
    );
    expect(fromFirstPath).toMatchObject({ hops: 1, to: "/archive/hello" });
    // The rows, the page, and the folder its path is composed from.
    expect(reads).toBeLessThanOrEqual(3);
    expect(await findRedirect(payload, { locale: "en", path: "/news/hello" })).toMatchObject({
      to: "/archive/hello",
    });
  });

  it("a moved folder redirects its pages through one prefix row", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const archive = await createFolder(payload, { slug: "archive" });
    await publishedPage(payload, { folder: archive.id, slug: "old-post" });

    await moveItems(payload, {
      items: [folderRef(archive.id)],
      overrideAccess: true,
      toFolder: blog.id,
    });

    expect((await readRows(payload)).map((row) => row.kind)).toEqual([
      "folderPrefix",
      "folderPrefix",
    ]);
    expect(await findRedirect(payload, { locale: "en", path: "/archive/old-post" })).toMatchObject({
      to: "/blog/archive/old-post",
    });
  });

  it("a new page at an old path deletes the row", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    expect((await readRows(payload)).map((row) => row.lookupKey)).toContain("en:/hello");

    await publishedPage(payload, { slug: "hello" });

    expect((await readRows(payload)).map((row) => row.lookupKey)).not.toContain("en:/hello");
    expect(await findRedirect(payload, { locale: "en", path: "/hello" })).toBeNull();
  });

  it("a draft that is published at an old path deletes the row", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    const draft = await createPage(payload, { slug: "hello" });
    // A draft is not at the path yet.
    expect((await readRows(payload)).map((row) => row.lookupKey)).toContain("en:/hello");

    await payload.update({
      collection: "pages",
      data: { _status: "published" } as never,
      depth: 0,
      id: draft.id,
      overrideAccess: true,
    });

    expect((await readRows(payload)).map((row) => row.lookupKey)).not.toContain("en:/hello");
  });

  it("a folder that takes an old folder path deletes the prefix row", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await renameFolder(payload, tree.about.id, "company");
    expect((await readRows(payload)).map((row) => row.lookupKey)).toContain("en:/about");

    await createFolder(payload, { slug: "about" });

    // The new folder is created in en only, and de serves its slug through the fallback.
    expect(await readRows(payload)).toEqual([]);
  });

  it("redirects false writes no row", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });

    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      redirects: false,
      toFolder: news.id,
    });
    await moveItems(payload, {
      items: [folderRef(tree.about.id)],
      overrideAccess: true,
      redirects: false,
      toFolder: news.id,
    });
    await renameFolder(payload, news.id, "latest", "en", { foldersRedirects: false });

    expect(await readRows(payload)).toEqual([]);
  });

  it("a newer change of the same old path replaces the row", async () => {
    const { payload } = harness;
    const misc = await createFolder(payload, { slug: "misc" });
    const page = await publishedPage(payload, { slug: "about" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: misc.id,
    });
    expect((await readRows(payload)).filter((row) => row.lookupKey === "en:/about")).toEqual([
      { kind: "page", lookupKey: "en:/about", target: `pages:${page.id}` },
    ]);
    // A folder at /about does not delete the page row (only a page at the path would), and when it
    // is renamed away its prefix row takes over the same key.
    const folder = await createFolder(payload, { slug: "about" });
    await publishedPage(payload, { folder: folder.id, slug: "contact" });

    await renameFolder(payload, folder.id, "company");

    const aboutRows = (await readRows(payload)).filter((row) => row.lookupKey === "en:/about");
    expect(aboutRows).toEqual([
      { kind: "folderPrefix", lookupKey: "en:/about", target: `folders:${folder.id}` },
    ]);
  });

  it("a draft-only change writes no row", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const draft = await createPage(payload, { slug: "idea" });
    const live = await publishedPage(payload, { slug: "live" });

    await moveItems(payload, {
      items: [pageRef(draft.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    // A draft over a published page changes no URL until it is published.
    await payload.update({
      collection: "pages",
      data: { slug: "live-draft" } as never,
      depth: 0,
      draft: true,
      id: live.id,
      overrideAccess: true,
    });

    expect(await readRows(payload)).toEqual([]);
  });

  it("keys are per locale", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { deSlug: "hallo", slug: "hello" });
    await forgetRows(payload);

    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });

    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual([
      "de:/hallo",
      "en:/hello",
    ]);
    expect(await findRedirect(payload, { locale: "de", path: "/hallo" })).toMatchObject({
      to: "/news/hallo",
    });
    expect(await findRedirect(payload, { locale: "en", path: "/hello" })).toMatchObject({
      to: "/news/hello",
    });
    // An English path is not a German key, and the other way round.
    expect(await findRedirect(payload, { locale: "de", path: "/hello" })).toBeNull();
    expect(await findRedirect(payload, { locale: "en", path: "/hallo" })).toBeNull();
  });

  it("the preview counts the rows the move writes", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { deSlug: "hallo", slug: "hello" });
    const draft = await createPage(payload, { slug: "idea" });
    await forgetRows(payload);
    const request = await createTestRequest(payload);

    const batch = {
      items: [pageRef(page.id), pageRef(draft.id), folderRef(tree.about.id)],
      overrideAccess: true,
      toFolder: news.id,
    };
    const preview = await planMove(request, batch, { overrideAccess: true });
    await moveItems(payload, batch);

    // hello in en and de, and the about folder in en and de (its pages are live through fallback).
    expect(preview.redirectRowsToWrite).toBe(4);
    expect(await readRows(payload)).toHaveLength(preview.redirectRowsToWrite);
  });

  it("a move rolled back leaves no row", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    const request = await createTestRequest(payload);
    // The caller owns the transaction, as a host that wraps a move in its own does.
    await initTransaction(request);

    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      req: request,
      toFolder: news.id,
    });
    await killTransaction(request);

    expect(await readRows(payload)).toEqual([]);
  });
});

describe("redirect rows on a publish", () => {
  it("a locale with its own draft status stays unpublished when only en goes live", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    // Created as a German draft, then published in English only: de has a status of its own, draft.
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
    await forgetRows(payload);

    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });

    // decision 24: the de draft is not served through the fallback, so only en has a URL to redirect.
    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual(["en:/draft-page"]);
  });

  it("publishing a slug change writes a page row for the old path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "old-name" });

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "new-name" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });

    expect(await readRows(payload)).toEqual(
      expect.arrayContaining([
        { kind: "page", lookupKey: "en:/blog/old-name", target: `pages:${page.id}` },
      ])
    );
    expect(await findRedirect(payload, { locale: "en", path: "/blog/old-name" })).toMatchObject({
      to: "/blog/new-name",
    });
  });

  it("publishing an en slug change also redirects the fallback locale, and a de slug of its own stays", async () => {
    const { payload } = harness;
    const fallbackPage = await publishedPage(payload, { slug: "welcome" });
    const ownPage = await publishedPage(payload, { deSlug: "willkommen", slug: "greeting" });
    await forgetRows(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "welcome-2" } as never,
      depth: 0,
      id: fallbackPage.id,
      locale: "en",
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "greeting-2" } as never,
      depth: 0,
      id: ownPage.id,
      locale: "en",
      overrideAccess: true,
    });

    const keys = (await readRows(payload)).map((row) => row.lookupKey);
    // decision 24: de serves the en-only page, so its old de URL moved too.
    expect(keys).toEqual(expect.arrayContaining(["de:/welcome", "en:/welcome", "en:/greeting"]));
    // The page with its own de slug kept its de URL.
    expect(keys).not.toContain("de:/greeting");
    expect(keys).not.toContain("de:/willkommen");
  });

  it("publishing a de slug change alone writes only a de row", async () => {
    const { payload } = harness;
    const page = await publishedPage(payload, { deSlug: "hallo", slug: "hello" });
    await forgetRows(payload);

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "hallo-welt" } as never,
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });

    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual(["de:/hallo"]);
  });

  it("making a page the root page writes a row for its old path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await publishedPage(payload, { folder: folder.id, slug: "home" });

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect((await readRows(payload)).map((row) => row.lookupKey)).toContain("en:/blog/home");
    expect(await findRedirect(payload, { locale: "en", path: "/blog/home" })).toMatchObject({
      to: "/blog",
    });
  });

  it("a publish that changes no URL writes no row", async () => {
    const { payload } = harness;
    const page = await publishedPage(payload, { slug: "steady" });

    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Steady again" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readRows(payload)).toEqual([]);
  });

  it("a publish with redirects off writes no row", async () => {
    const { payload } = harness;
    const page = await publishedPage(payload, { slug: "old-name" });

    await payload.update({
      collection: "pages",
      context: { foldersRedirects: false },
      data: { _status: "published", slug: "new-name" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });

    expect(await readRows(payload)).toEqual([]);
  });
});

describe("redirect rows and deletes", () => {
  it("deleting a page or a folder removes the rows that target it", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });
    expect(await readRows(payload)).not.toEqual([]);

    await payload.delete({ collection: "pages", id: page.id, overrideAccess: true });

    expect(await readRows(payload)).toEqual([]);
  });
});

describe("findRedirect without a locale", () => {
  it("a localized app reads the default locale when none is named", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });

    expect(await findRedirect(payload, { path: "/hello" })).toMatchObject({ to: "/news/hello" });
    expect(await findRedirect(payload, { locale: null, path: "/hello" })).toMatchObject({
      to: "/news/hello",
    });
  });
});

describe("findRedirect hops", () => {
  it("follows at most three hops and returns null past them", async () => {
    const { payload } = harness;
    const now = new Date().toISOString();
    // /a leads to the folder at /x, /x to the one at /y, /y to /z, /z to /w: four rows, none live.
    const folders = [
      await createFolder(payload, { slug: "x" }),
      await createFolder(payload, { slug: "y" }),
      await createFolder(payload, { slug: "z" }),
      await createFolder(payload, { slug: "w" }),
    ];
    for (const [index, fromPath] of ["/a", "/x", "/y", "/z"].entries()) {
      await payload.db.create({
        collection: "folder-redirects",
        data: {
          createdAt: now,
          fromPath,
          kind: "folderPrefix",
          locale: "en",
          lookupKey: `en:${fromPath}`,
          target: { relationTo: "folders", value: folders[index].id },
          updatedAt: now,
        },
      });
    }
    const visited: string[] = [];

    const result = await findRedirect(payload, {
      isLive: (path) => {
        visited.push(path);

        return false;
      },
      locale: "en",
      path: "/a",
    });

    expect(result).toBeNull();
    expect(visited).toEqual(["/x", "/y", "/z"]);
  });

  it("a row whose answer is the request itself is dead", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "about" });
    const now = new Date().toISOString();
    // A stale prefix row of a folder that sits at the old path again.
    await payload.db.create({
      collection: "folder-redirects",
      data: {
        createdAt: now,
        fromPath: "/about",
        kind: "folderPrefix",
        locale: "en",
        lookupKey: "en:/about",
        target: { relationTo: "folders", value: folder.id },
        updatedAt: now,
      },
    });

    expect(await findRedirect(payload, { locale: "en", path: "/about/missing" })).toBeNull();
    expect(await findRedirect(payload, { locale: "en", path: "/about" })).toBeNull();
  });

  it("stops at the first live answer", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const page = await publishedPage(payload, { slug: "hello" });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: news.id,
    });

    const result = await findRedirect(payload, {
      isLive: (path) => path === "/news/hello",
      locale: "en",
      path: "/hello",
    });

    expect(result).toMatchObject({ hops: 1, to: "/news/hello" });
  });
});

describe("redirect rows when folders are not localized", () => {
  let unlocalized: TestPayload;

  beforeAll(async () => {
    unlocalized = await getTestPayload({ foldersOptions: { localizeSegments: false } });
  });

  afterAll(async () => {
    await unlocalized?.destroy();
  });

  afterEach(async () => {
    await forgetRows(unlocalized.payload);
    await clearTree(unlocalized.payload);
  });

  const aboutWithPage = async (payload: Payload) => {
    const folder = await createFolder(payload, { slug: "about" });
    await publishedPage(payload, { folder: folder.id, slug: "contact" });

    return folder;
  };

  it("a folder that takes an old path deletes the prefix row in every page locale", async () => {
    const { payload } = unlocalized;
    const folder = await aboutWithPage(payload);
    await renameFolder(payload, folder.id, "company");
    // One row per page locale: the folder has a single path, the pages are read in en and de.
    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual([
      "de:/about",
      "en:/about",
    ]);

    await createFolder(payload, { slug: "about" });

    expect(await readRows(payload)).toEqual([]);
    expect(await findRedirect(payload, { locale: "en", path: "/about/x" })).toBeNull();
    expect(await findRedirect(payload, { locale: "de", path: "/about/x" })).toBeNull();
  });

  it("renaming a folder back to an old path leaves no row and no 301 loop", async () => {
    const { payload } = unlocalized;
    const folder = await aboutWithPage(payload);
    await renameFolder(payload, folder.id, "company");

    await renameFolder(payload, folder.id, "about");

    const keys = (await readRows(payload)).map((row) => row.lookupKey);
    expect(keys).not.toContain("en:/about");
    expect(keys).not.toContain("de:/about");
    expect(await findRedirect(payload, { locale: "en", path: "/about/missing" })).toBeNull();
    // The path it left in between still leads back.
    expect(await findRedirect(payload, { locale: "en", path: "/company/contact" })).toMatchObject({
      to: "/about/contact",
    });
  });

  it("a move to an old folder path clears the prefix rows in every page locale", async () => {
    const { payload } = unlocalized;
    const folder = await aboutWithPage(payload);
    const parent = await createFolder(payload, { slug: "parent" });
    await moveItems(payload, {
      items: [folderRef(folder.id)],
      overrideAccess: true,
      toFolder: parent.id,
    });
    expect((await readRows(payload)).map((row) => row.lookupKey)).toEqual([
      "de:/about",
      "en:/about",
    ]);

    await moveItems(payload, {
      items: [folderRef(folder.id)],
      overrideAccess: true,
      toFolder: null,
    });

    const keys = (await readRows(payload)).map((row) => row.lookupKey);
    expect(keys).not.toContain("en:/about");
    expect(keys).not.toContain("de:/about");
    expect(await findRedirect(payload, { locale: "en", path: "/about/missing" })).toBeNull();
  });
});
