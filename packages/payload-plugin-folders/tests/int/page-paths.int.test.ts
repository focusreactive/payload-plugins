import type { CollectionConfig, Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { countCallsOn, countDbCalls } from "../helpers/countDbCalls.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import { runGraphql } from "../helpers/runGraphql.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage, uniqueName } from "../helpers/treeFixtures.js";

let harness: TestPayload;

// A collection that points at pages, to read a page populated through a relationship.
const linkHolders = {
  slug: "link-holders",
  fields: [
    { name: "label", type: "text" },
    { name: "page", type: "relationship", relationTo: "pages" },
  ],
} as unknown as CollectionConfig;

beforeAll(async () => {
  harness = await getTestPayload({ extraCollections: [linkHolders] });
});

afterAll(async () => {
  await harness?.destroy();
});

type PageDoc = {
  folder: number | null;
  folderPath: string | Record<string, string> | null;
  fullPath: string | Record<string, string> | null;
  id: number;
  isFolderRoot: boolean;
  pathSegment: string | Record<string, string> | null;
  slug: string | Record<string, string>;
};

const readPage = (
  payload: Payload,
  id: number,
  options: { draft?: boolean; locale?: "all" | "de" | "en" } = {}
) =>
  payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    overrideAccess: true,
    ...options,
  }) as unknown as Promise<PageDoc>;

const createRootPage = (payload: Payload, folder: number | null) =>
  payload.create({
    collection: "pages",
    data: { folder, isFolderRoot: true, slug: uniqueName("root"), title: "Root" },
    depth: 0,
    overrideAccess: true,
  });

const query = async (path: string): Promise<number[]> => {
  const { body, status } = await callEndpoint<{ docs: Array<{ id: number }> }>({
    config: harness.config,
    path,
    payload: harness.payload,
  });
  expect(status).toBe(200);

  return body.docs.map((doc) => doc.id).sort((first, second) => first - second);
};

const sorted = (ids: number[]) => [...ids].sort((first, second) => first - second);

describe("page paths", () => {
  it("fullPath for nested, root and site root pages", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
    const year = await createFolder(payload, { name: "2026", parent: blog.id, slug: "2026" });

    const topLevel = await createPage(payload, { folder: null, slug: "about" });
    const inBlog = await createPage(payload, { folder: blog.id, slug: "post" });
    const nested = await createPage(payload, { folder: year.id, slug: "new-year" });
    const blogRoot = await createRootPage(payload, blog.id);
    const siteRoot = await createRootPage(payload, null);

    expect((await readPage(payload, topLevel.id)).fullPath).toBe("/about");
    expect((await readPage(payload, inBlog.id)).fullPath).toBe("/blog/post");
    expect((await readPage(payload, nested.id)).fullPath).toBe("/blog/2026/new-year");
    expect((await readPage(payload, blogRoot.id)).fullPath).toBe("/blog");
    expect((await readPage(payload, siteRoot.id)).fullPath).toBe("/");

    // A list read composes the same path.
    const list = await payload.find({
      collection: "pages",
      overrideAccess: true,
      where: { id: { in: [inBlog.id, nested.id] } },
    });
    expect(list.docs.map((doc) => (doc as unknown as PageDoc).fullPath).sort()).toEqual([
      "/blog/2026/new-year",
      "/blog/post",
    ]);

    // A page populated through a relationship composes it too, at depth 1 and from a list.
    const holder = (await payload.create({
      collection: "link-holders" as never,
      data: { label: "Link", page: nested.id } as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const populated = (await payload.findByID({
      collection: "link-holders" as never,
      depth: 1,
      id: holder.id,
      overrideAccess: true,
    })) as unknown as { page: PageDoc };
    expect(populated.page.id).toBe(nested.id);
    expect(populated.page.fullPath).toBe("/blog/2026/new-year");
    expect(populated.page.folderPath).toBe("/blog/2026");
    const populatedList = (await payload.find({
      collection: "link-holders" as never,
      depth: 1,
      overrideAccess: true,
      where: { id: { equals: holder.id } },
    })) as unknown as { docs: Array<{ page: PageDoc }> };
    expect(populatedList.docs[0].page.fullPath).toBe("/blog/2026/new-year");
  });

  it("fullPath is correct, or unset, under a select", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Sel", slug: "sel" });
    const child = await createPage(payload, { folder: folder.id, slug: "child" });
    const root = await createRootPage(payload, folder.id);
    const select = async (id: number, fields: string[]) =>
      (await payload.findByID({
        collection: "pages",
        depth: 0,
        id,
        overrideAccess: true,
        select: Object.fromEntries(fields.map((field) => [field, true])),
      })) as unknown as Partial<PageDoc>;

    // A selected fullPath loads the inputs it is composed from.
    expect((await select(child.id, ["fullPath", "pathSegment"])).fullPath).toBe("/sel/child");
    expect((await select(child.id, ["folder", "fullPath"])).fullPath).toBe("/sel/child");
    expect(
      (await select(root.id, ["folder", "folderPath", "pathSegment", "fullPath"])).fullPath
    ).toBe("/sel");
    expect((await select(root.id, ["fullPath"])).fullPath).toBe("/sel");
    expect((await select(child.id, ["fullPath"])).fullPath).toBe("/sel/child");

    // A select without fullPath, and without all of its inputs, does not invent one.
    expect((await select(child.id, ["pathSegment"])).fullPath).toBeUndefined();
    expect((await select(child.id, ["folder", "pathSegment"])).fullPath).toBeUndefined();

    // An exclude select that drops inputs keeps them while fullPath is not excluded.
    const excludeInputs = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: root.id,
      overrideAccess: true,
      select: { isFolderRoot: false, pathSegment: false },
    })) as unknown as Partial<PageDoc>;
    expect(excludeInputs.fullPath).toBe("/sel");
    const excludeOther = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: root.id,
      overrideAccess: true,
      select: { title: false },
    })) as unknown as Partial<PageDoc>;
    expect(excludeOther.fullPath).toBe("/sel");
    const excludeInput = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: root.id,
      overrideAccess: true,
      select: { pathSegment: false },
    })) as unknown as Partial<PageDoc>;
    expect(excludeInput.fullPath).toBe("/sel");
    const excludeFullPath = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: root.id,
      overrideAccess: true,
      select: { fullPath: false, pathSegment: false },
    })) as unknown as Partial<PageDoc>;
    expect(excludeFullPath.fullPath).toBeUndefined();
  });

  it("GraphQL composes fullPath, and its where cannot take a locale-qualified path", async () => {
    const { payload } = harness;
    const user = await payload.create({
      collection: "users",
      data: { email: "graphql-tester@example.com", password: "test-password", role: "admin" },
      overrideAccess: true,
    });
    const page = await createPage(payload, { folder: null, slug: "graphql-page" });

    const composed = await runGraphql(
      harness,
      user,
      `{ Pages(locale: de, where: { id: { equals: ${page.id} } }) { docs { fullPath pathSegment } } }`
    );
    expect(composed.errors).toBeUndefined();
    expect(composed.data).toEqual({
      Pages: { docs: [{ fullPath: "/graphql-page", pathSegment: "graphql-page" }] },
    });

    // `exists` works, so a de page without its own segment can be listed, but the en half of the
    // helper's where has no GraphQL spelling: the where input has no `pathSegment__en`.
    const noOwnSegment = await runGraphql(
      harness,
      user,
      `{ Pages(locale: de, where: { AND: [{ id: { equals: ${page.id} } }, { pathSegment: { exists: false } }] }) { docs { id } } }`
    );
    expect(noOwnSegment.data).toEqual({ Pages: { docs: [{ id: page.id }] } });
    const qualified = await runGraphql(
      harness,
      user,
      `{ Pages(locale: de, where: { pathSegment__en: { equals: "graphql-page" } }) { docs { id } } }`
    );
    expect(qualified.invalid?.[0]).toContain("pathSegment__en");
  });

  it("folderPath reads null, not undefined, for a page at the site root", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Docs", slug: "docs" });
    const atRoot = await createPage(payload, { folder: null, slug: "contact" });
    const inFolder = await createPage(payload, { folder: folder.id, slug: "guide" });

    const rootRead = await readPage(payload, atRoot.id);
    expect(rootRead.folderPath).toBeNull();
    expect("folderPath" in rootRead).toBe(true);
    expect((await readPage(payload, inFolder.id)).folderPath).toBe("/docs");

    const all = await readPage(payload, atRoot.id, { locale: "all" });
    expect(all.folderPath).toBeNull();

    const rest = await callEndpoint<PageDoc>({
      config: harness.config,
      path: `/pages/${atRoot.id}`,
      payload,
    });
    expect(rest.body.folderPath).toBeNull();
  });

  it("fullPath with locale=all", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog-all" });
    await payload.update({
      collection: "folders",
      data: { name: "Aktuelles", slug: "aktuelles-all" },
      id: blog.id,
      locale: "de",
      overrideAccess: true,
    });
    const translated = await createPage(payload, { folder: blog.id, slug: "post" });
    await payload.update({
      collection: "pages",
      data: { slug: "beitrag", title: "Beitrag" },
      id: translated.id,
      locale: "de",
      overrideAccess: true,
    });
    const untranslated = await createPage(payload, { folder: blog.id, slug: "news" });
    const atRoot = await createPage(payload, { folder: null, slug: "imprint" });

    const translatedAll = await readPage(payload, translated.id, { locale: "all" });
    expect(translatedAll.fullPath).toEqual({
      de: "/aktuelles-all/beitrag",
      en: "/blog-all/post",
    });
    expect(translatedAll.folderPath).toEqual({ de: "/aktuelles-all", en: "/blog-all" });
    expect(translatedAll.pathSegment).toEqual({ de: "beitrag", en: "post" });

    // A locale that falls back to the default slug still gets its own folder path.
    expect((await readPage(payload, untranslated.id, { locale: "all" })).fullPath).toEqual({
      de: "/aktuelles-all/news",
      en: "/blog-all/news",
    });
    expect((await readPage(payload, atRoot.id, { locale: "all" })).fullPath).toEqual({
      de: "/imprint",
      en: "/imprint",
    });

    const rest = await callEndpoint<PageDoc>({
      config: harness.config,
      path: `/pages/${translated.id}?locale=all`,
      payload,
    });
    expect(rest.body.fullPath).toEqual({ de: "/aktuelles-all/beitrag", en: "/blog-all/post" });

    // Reading one locale gives that locale's path as a string.
    expect((await readPage(payload, translated.id, { locale: "de" })).fullPath).toBe(
      "/aktuelles-all/beitrag"
    );
  });

  it("a draft slug change shows only with draft true", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Drafts", slug: "drafts" });
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", folder: folder.id, slug: "live", title: "Live" },
      depth: 0,
      overrideAccess: true,
    });

    await payload.update({
      collection: "pages",
      data: { slug: "next" },
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    expect((await readPage(payload, page.id)).fullPath).toBe("/drafts/live");
    expect((await readPage(payload, page.id, { draft: true })).fullPath).toBe("/drafts/next");

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "next" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    expect((await readPage(payload, page.id)).fullPath).toBe("/drafts/next");
  });

  it("where folderPath equals /blog and pathSegment equals post finds the page", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog-find" });
    const archive = await createFolder(payload, { name: "Archive", slug: "archive-find" });
    const wanted = await createPage(payload, { folder: blog.id, slug: "post" });
    await createPage(payload, { folder: archive.id, slug: "post" });
    await createPage(payload, { folder: blog.id, slug: "other" });
    const atRoot = await createPage(payload, { folder: null, slug: "post-top-level" });
    await createRootPage(payload, blog.id);
    const rootPage = await createRootPage(payload, null);

    expect(
      await query(
        "/pages?where[folderPath][equals]=/blog-find&where[pathSegment][equals]=post&where[isFolderRoot][not_equals]=true&locale=en"
      )
    ).toEqual([wanted.id]);

    // The page at the top level, and the two root pages, use the other recipes of spec section 3.4.
    expect(
      await query(
        "/pages?where[folder][exists]=false&where[pathSegment][equals]=post-top-level&where[isFolderRoot][not_equals]=true"
      )
    ).toEqual([atRoot.id]);
    const siteRootPages = await query(
      "/pages?where[folder][exists]=false&where[isFolderRoot][equals]=true"
    );
    expect(siteRootPages).toContain(rootPage.id);
    expect(siteRootPages).not.toContain(atRoot.id);
  });

  it("where folderPath equals /aktuelles with locale de finds the page under the folder whose de path is /aktuelles", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "News", slug: "news-grade" });
    await payload.update({
      collection: "folders",
      data: { name: "Aktuelles", slug: "aktuelles-grade" },
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });
    const page = await createPage(payload, { folder: folder.id, slug: "story" });
    await payload.update({
      collection: "pages",
      data: { slug: "geschichte", title: "Geschichte" },
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
    const fallbackPage = await createPage(payload, { folder: folder.id, slug: "update" });

    expect(await query("/pages?where[folderPath][equals]=/aktuelles-grade&locale=de")).toEqual(
      sorted([page.id, fallbackPage.id])
    );
    expect(
      await query(
        "/pages?where[folderPath][equals]=/aktuelles-grade&where[pathSegment][equals]=geschichte&locale=de"
      )
    ).toEqual([page.id]);
    // The fallback page has no de segment of its own, so a plain equals misses it in de; the
    // helper's where (tests/int/segment-fallback.int.test.ts) is what finds it.
    expect(
      await query(
        "/pages?where[folderPath][equals]=/aktuelles-grade&where[pathSegment][equals]=update&locale=de"
      )
    ).toEqual([]);

    // The folder's en path does not leak into de, and the de path does not leak into en.
    expect(await query("/pages?where[folderPath][equals]=/news-grade&locale=de")).toEqual([]);
    expect(await query("/pages?where[folderPath][equals]=/aktuelles-grade&locale=en")).toEqual([]);
    expect(await query("/pages?where[folderPath][equals]=/news-grade&locale=en")).toEqual(
      sorted([page.id, fallbackPage.id])
    );
  });

  it("starts_with through folder.ancestorIds contains finds the whole subtree", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog-tree" });
    const year = await createFolder(payload, { name: "2026", parent: blog.id, slug: "2026" });
    const quarter = await createFolder(payload, { name: "Q1", parent: year.id, slug: "q1" });
    // A path that merely contains /blog-tree/ must not match, which `like` on folderPath would.
    const archive = await createFolder(payload, { name: "Archive", slug: "archive-tree" });
    const decoy = await createFolder(payload, {
      name: "Blog tree",
      parent: archive.id,
      slug: "blog-tree",
    });
    const sibling = await createFolder(payload, { name: "Blog tree two", slug: "blog-tree-two" });

    const inBlog = await createPage(payload, { folder: blog.id });
    const inYear = await createPage(payload, { folder: year.id });
    const inQuarter = await createPage(payload, { folder: quarter.id });
    await createPage(payload, { folder: decoy.id });
    await createPage(payload, { folder: sibling.id });
    await createPage(payload, { folder: null });

    const subtree = await query(
      `/pages?where[or][0][folder][equals]=${blog.id}&where[or][1][folder.ancestorIds][contains]=/${blog.id}/`
    );
    expect(subtree).toEqual(sorted([inBlog.id, inYear.id, inQuarter.id]));
  });

  it("sort=folderPath works", async () => {
    const { payload } = harness;
    const zebra = await createFolder(payload, { name: "Zebra", slug: "sort-zebra" });
    const apple = await createFolder(payload, { name: "Apple", slug: "sort-apple" });
    const mango = await createFolder(payload, { name: "Mango", slug: "sort-mango" });
    await createPage(payload, { folder: zebra.id, slug: "z-page" });
    await createPage(payload, { folder: apple.id, slug: "a-page" });
    await createPage(payload, { folder: mango.id, slug: "m-page" });

    const ascending = await payload.find({
      collection: "pages",
      overrideAccess: true,
      sort: "folderPath",
      where: { folderPath: { like: "sort-" } },
    });
    expect(ascending.docs.map((doc) => doc.folderPath)).toEqual([
      "/sort-apple",
      "/sort-mango",
      "/sort-zebra",
    ]);

    const descending = await payload.find({
      collection: "pages",
      overrideAccess: true,
      sort: "-folderPath",
      where: { folderPath: { like: "sort-" } },
    });
    expect(descending.docs.map((doc) => doc.folderPath)).toEqual([
      "/sort-zebra",
      "/sort-mango",
      "/sort-apple",
    ]);
  });

  it("listing 100 pages across 10 folders costs at most 2 folder queries", async () => {
    const { payload } = harness;
    const folders = [];
    for (let index = 0; index < 10; index += 1) {
      folders.push(await createFolder(payload, { name: `Bulk ${index}`, slug: `bulk-${index}` }));
    }
    for (let index = 0; index < 100; index += 1) {
      await createPage(payload, { folder: folders[index % 10].id, slug: `bulk-page-${index}` });
    }

    const { calls, result } = await countDbCalls(payload, () =>
      payload.find({
        collection: "pages",
        limit: 100,
        overrideAccess: true,
        where: { folderPath: { like: "bulk-" } },
      })
    );

    expect(result.docs).toHaveLength(100);
    for (const doc of result.docs) {
      expect(doc.fullPath).toMatch(/^\/bulk-\d\/bulk-page-\d+$/u);
    }
    expect(countCallsOn(calls, "folders")).toBeLessThanOrEqual(2);

    const withAllLocales = await countDbCalls(payload, () =>
      payload.find({
        collection: "pages",
        limit: 100,
        locale: "all",
        overrideAccess: true,
        where: { folderPath: { like: "bulk-" } },
      })
    );
    expect(withAllLocales.result.docs).toHaveLength(100);
    expect(countCallsOn(withAllLocales.calls, "folders")).toBeLessThanOrEqual(2);
  }, 120_000);
});

describe("pathSegment is computed by the plugin", () => {
  it("a client-sent pathSegment over REST is overwritten on create and on a slug change", async () => {
    const { config, payload } = harness;
    const created = await callEndpoint<{ doc: PageDoc }>({
      body: { folder: null, pathSegment: "evil", slug: "honest", title: "Honest" },
      config,
      method: "POST",
      path: "/pages",
      payload,
    });
    expect(created.status).toBe(201);
    expect(created.body.doc.pathSegment).toBe("honest");

    const renamed = await callEndpoint<{ doc: PageDoc }>({
      body: { pathSegment: "evil", slug: "renamed" },
      config,
      method: "PATCH",
      path: `/pages/${created.body.doc.id}`,
      payload,
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.doc.pathSegment).toBe("renamed");

    const untouched = await callEndpoint<{ doc: PageDoc }>({
      body: { pathSegment: "evil", title: "New title" },
      config,
      method: "PATCH",
      path: `/pages/${created.body.doc.id}`,
      payload,
    });
    expect(untouched.body.doc.pathSegment).toBe("renamed");

    const withoutSlug = await callEndpoint<{ doc: PageDoc }>({
      body: { folder: null, pathSegment: "evil", title: "No slug" },
      config,
      method: "POST",
      path: "/pages",
      payload,
    });
    // The slug is derived from the title (spec section 2.6); the client's pathSegment is not used.
    expect(withoutSlug.body.doc.pathSegment).toBe("no-slug");

    // The same holds for a collection whose slug is not localized.
    const post = await callEndpoint<{ doc: PageDoc }>({
      body: { folder: null, pathSegment: "evil", slug: "a-post", title: "Post" },
      config,
      method: "POST",
      path: "/posts",
      payload,
    });
    expect(post.body.doc.pathSegment).toBe("a-post");
    const renamedPost = await callEndpoint<{ doc: PageDoc }>({
      body: { pathSegment: "evil", slug: "a-new-post" },
      config,
      method: "PATCH",
      path: `/posts/${post.body.doc.id}`,
      payload,
    });
    expect(renamedPost.body.doc.pathSegment).toBe("a-new-post");
  });
});
