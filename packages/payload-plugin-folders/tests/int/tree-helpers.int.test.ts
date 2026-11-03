import { handleEndpoints } from "payload";
import type { CollectionConfig, User } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FoldersClientError, createFoldersClient } from "../../src/rest/index.js";
import {
  getAllPaths,
  getPathsPage,
  getTree,
  moveItems,
  resolvePath,
} from "../../src/server/index.js";
import type { PathRow, TreeNode } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder } from "../helpers/treeFixtures.js";

// Anyone may read these, so the public frontend case needs no sign-in.
const articles: CollectionConfig = {
  slug: "articles",
  access: { read: () => true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true },
  ],
  versions: { drafts: true },
};

let harness: TestPayload;
let editor: User;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [articles],
    foldersOptions: { collections: { articles: true, pages: true, posts: true } as never },
  });
  editor = (await harness.payload.create({
    collection: "users",
    data: { email: "tree-editor@example.com", password: "test-password", role: "editor" },
    overrideAccess: true,
  })) as unknown as User;
});

afterAll(async () => {
  await harness?.destroy();
});

type ArticleData = {
  folder?: number | null;
  isFolderRoot?: boolean;
  slug: string;
  status?: "draft" | "published";
  title?: string;
};

const createArticle = (data: ArticleData) =>
  harness.payload.create({
    collection: "articles" as never,
    data: {
      _status: data.status ?? "published",
      folder: data.folder ?? null,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.title ?? data.slug,
    } as never,
    depth: 0,
    draft: data.status === "draft",
    overrideAccess: true,
  }) as unknown as Promise<{ id: number }>;

/** What a helper answer looks like after the trip over HTTP. */
const same = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** Rows in one fixed order, for comparing two answers that page differently. */
const byRowKey = (rows: PathRow[]): PathRow[] =>
  rows.toSorted((left, right) =>
    `${left.collection}/${left.id}/${left.locale}`.localeCompare(
      `${right.collection}/${right.id}/${right.locale}`,
      "en",
      { numeric: true }
    )
  );

const titlesOf = (nodes: TreeNode[]): string[] => nodes.map((node) => node.title);

const findNode = (nodes: TreeNode[], title: string): TreeNode | undefined => {
  for (const node of nodes) {
    if (node.title === title) {
      return node;
    }
    const inner = findNode(node.children, title);
    if (inner) {
      return inner;
    }
  }

  return undefined;
};

// The site every case below reads.
const site: {
  archiveBlogPage?: { id: number };
  blog?: { id: number };
  blogHome?: { id: number };
  deepest?: { id: number };
  docs?: { id: number };
  draftOnly?: { id: number };
  empty?: { id: number };
  newYear?: { id: number };
  team?: { id: number };
  year?: { id: number };
} = {};

describe("tree helpers", () => {
  beforeAll(async () => {
    const { payload } = harness;
    site.blog = await createFolder(payload, { name: "Blog", slug: "blog" });
    site.blogHome = await createArticle({
      folder: site.blog.id,
      isFolderRoot: true,
      slug: "home",
      title: "Blog Home",
    });
    site.team = await createArticle({ folder: site.blog.id, slug: "team", title: "Team" });
    site.year = await createFolder(payload, { name: "2026", parent: site.blog.id, slug: "2026" });
    site.newYear = await createArticle({
      folder: site.year.id,
      slug: "new-year",
      title: "New Year",
    });
    site.docs = await createFolder(payload, { name: "Docs", slug: "docs" });
    await createArticle({ folder: site.docs.id, slug: "guide", title: "Guide" });
    await createArticle({ slug: "welcome", title: "Welcome" });
    site.draftOnly = await createFolder(payload, { name: "Unannounced", slug: "unannounced" });
    await createArticle({
      folder: site.draftOnly.id,
      slug: "plan",
      status: "draft",
      title: "Plan",
    });
    site.empty = await createFolder(payload, { name: "Empty", slug: "empty" });
    const deep = await createFolder(payload, { name: "Deep", slug: "deep" });
    const deeper = await createFolder(payload, { name: "Deeper", parent: deep.id, slug: "deeper" });
    site.deepest = await createFolder(payload, {
      name: "Deepest",
      parent: deeper.id,
      slug: "deepest",
    });
    await createArticle({ folder: site.deepest.id, slug: "bottom", title: "Bottom" });
    // A folder that only looks like /blog from the inside: its path ends in /blog.
    const archive = await createFolder(payload, { name: "Archive", slug: "archive" });
    const archivedBlog = await createFolder(payload, {
      name: "Old blog",
      parent: archive.id,
      slug: "blog",
    });
    site.archiveBlogPage = await createArticle({
      folder: archivedBlog.id,
      slug: "x",
      title: "Archived",
    });
  });

  it("getTree nests and orders", async () => {
    const { payload } = harness;
    const tree = await getTree(payload, { depth: 5 });

    // New items go on top, so the newest sibling comes first; folders and pages mix by order key.
    const blog = tree.find((node) => node.title === "Blog");
    expect(blog).toMatchObject({
      collection: "folders",
      fullPath: "/blog",
      hasPage: true,
      id: site.blog?.id,
      isFolderRoot: false,
      kind: "folder",
    });
    expect(typeof blog?.updatedAt).toBe("string");
    expect(titlesOf(blog?.children ?? [])).toEqual(["2026", "Team", "Blog Home"]);
    expect(blog?.children[2]).toMatchObject({
      children: [],
      collection: "articles",
      fullPath: "/blog",
      hasPage: false,
      isFolderRoot: true,
      kind: "page",
    });
    expect(findNode(tree, "New Year")).toMatchObject({ fullPath: "/blog/2026/new-year" });
    expect(findNode(tree, "Bottom")?.fullPath).toBe("/deep/deeper/deepest/bottom");
    // A page at the top level sits beside the folders, ordered with them.
    expect(tree.some((node) => node.title === "Welcome" && node.fullPath === "/welcome")).toBe(
      true
    );
    // Folders with nothing visible in them are left out.
    expect(titlesOf(tree)).not.toContain("Empty");
    expect(titlesOf(tree)).not.toContain("Unannounced");

    // Moving a page to the start of its folder changes the order the tree returns.
    await moveItems(payload, {
      items: [{ collection: "articles", id: site.blogHome?.id as number }],
      overrideAccess: true,
      position: "start",
      toFolder: site.blog?.id as number,
    });
    const moved = await getTree(payload, { depth: 5, root: site.blog?.id });
    expect(titlesOf(moved)).toEqual(["Blog Home", "2026", "Team"]);
    expect(moved[1].children.map((node) => node.fullPath)).toEqual(["/blog/2026/new-year"]);

    // `depth` counts levels, and a folder whose page sits below the last level is still shown.
    const shallow = await getTree(payload, { depth: 1 });
    expect(shallow.every((node) => node.children.length === 0)).toBe(true);
    expect(titlesOf(shallow)).toContain("Deep");
    const twoLevels = await getTree(payload, { depth: 2 });
    const twoLevelBlog = twoLevels.find((node) => node.title === "Blog");
    expect(titlesOf(twoLevelBlog?.children ?? [])).toEqual(["Blog Home", "2026", "Team"]);
    expect(twoLevelBlog?.children[1].children).toEqual([]);
  });

  it("getAllPaths under /blog lists only that subtree", async () => {
    const { payload } = harness;

    const rows = await getAllPaths(payload, { under: "/blog" });

    expect(rows.map((row) => row.fullPath)).toEqual(["/blog", "/blog/2026/new-year", "/blog/team"]);
    expect(rows.every((row) => row.collection === "articles" && row.locale === "en")).toBe(true);
    expect(typeof rows[0].updatedAt).toBe("string");
    // The archived page under /archive/blog is not beneath /blog, whatever its path ends in.
    expect(rows.map((row) => row.id)).not.toContain(site.archiveBlogPage?.id);
    expect(
      (await getAllPaths(payload, { under: "/archive/blog" })).map((row) => row.fullPath)
    ).toEqual(["/archive/blog/x"]);
    expect(
      (await getAllPaths(payload, { rootPages: "only", under: "/Blog/" })).map(
        (row) => row.fullPath
      )
    ).toEqual(["/blog"]);
    expect(
      (await getAllPaths(payload, { rootPages: "exclude", under: "/blog" })).map(
        (row) => row.fullPath
      )
    ).toEqual(["/blog/2026/new-year", "/blog/team"]);
    expect(await getAllPaths(payload, { under: "/no-such-folder" })).toEqual([]);
    // Without `under` it lists every published page.
    const every = (await getAllPaths(payload)).map((row) => row.fullPath);
    expect(every).toEqual(expect.arrayContaining(["/welcome", "/docs/guide", "/blog/team"]));
  });

  it("a never-published page is absent from getAllPaths", async () => {
    const { payload } = harness;
    const publicRows = (await getAllPaths(payload)).map((row) => row.fullPath);

    expect(publicRows).not.toContain("/unannounced/plan");
    // Asking for drafts as nobody changes nothing.
    expect((await getAllPaths(payload, { draft: true })).map((row) => row.fullPath)).not.toContain(
      "/unannounced/plan"
    );
    const draftRows = (await getAllPaths(payload, { draft: true, user: editor })).map(
      (row) => row.fullPath
    );
    expect(draftRows).toContain("/unannounced/plan");
    // The same reader without `draft` reads published pages only.
    expect((await getAllPaths(payload, { user: editor })).map((row) => row.fullPath)).not.toContain(
      "/unannounced/plan"
    );
  });

  it("anonymous tree output omits a folder with only drafts", async () => {
    const { payload } = harness;

    expect(titlesOf(await getTree(payload, { includeEmptyFolders: true }))).not.toContain(
      "Unannounced"
    );
    expect(titlesOf(await getTree(payload, { draft: true }))).not.toContain("Unannounced");

    // A signed-in reader sees the folder when drafts count, or when empty folders are asked for.
    const withDrafts = await getTree(payload, { draft: true, user: editor });
    expect(findNode(withDrafts, "Unannounced")?.children.map((node) => node.title)).toEqual([
      "Plan",
    ]);
    const withEmpty = await getTree(payload, { includeEmptyFolders: true, user: editor });
    expect(titlesOf(withEmpty)).toEqual(expect.arrayContaining(["Unannounced", "Empty"]));
    expect(titlesOf(await getTree(payload, { user: editor }))).not.toContain("Empty");
  });

  it("alternates list both locales", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { name: "News", slug: "news" });
    const story = await createArticle({ folder: news.id, slug: "story", title: "Story" });
    const hidden = await createArticle({ folder: news.id, slug: "hidden", title: "Hidden" });
    await payload.update({
      collection: "folders",
      data: { name: "Nachrichten", slug: "nachrichten" },
      id: news.id,
      locale: "de",
      overrideAccess: true,
    });
    // Published in de, then unpublished there: de has a status of its own and it is draft.
    await payload.update({
      collection: "articles" as never,
      data: { _status: "published", title: "Versteckt" } as never,
      id: hidden.id,
      locale: "de",
      overrideAccess: true,
    });
    await payload.update({
      collection: "articles" as never,
      data: { _status: "draft" } as never,
      id: hidden.id,
      locale: "de",
      overrideAccess: true,
    });

    const tree = await getTree(payload, { depth: 3, root: news.id });
    expect(tree.find((node) => node.title === "Story")?.alternates).toEqual({
      de: "/nachrichten/story",
      en: "/news/story",
    });
    // A locale the page is not live in has no alternate.
    expect(tree.find((node) => node.title === "Hidden")?.alternates).toEqual({
      en: "/news/hidden",
    });
    const folderNode = (await getTree(payload, { depth: 1 })).find((node) => node.id === news.id);
    expect(folderNode?.alternates).toEqual({ de: "/nachrichten", en: "/news" });
    // The tree in de shows de paths and titles.
    const german = await getTree(payload, { depth: 3, locale: "de", root: news.id });
    expect(german.map((node) => node.fullPath)).toEqual(["/nachrichten/story"]);

    const resolved = await resolvePath(payload, { locale: "de", path: "/nachrichten/story" });
    expect(resolved).toMatchObject({
      alternates: { de: "/nachrichten/story", en: "/news/story" },
      fullPath: "/nachrichten/story",
      locale: "de",
      type: "page",
    });
    const rows = (await getAllPaths(payload, { locale: "all", under: "/news" })).map(
      ({ fullPath, id, locale }) => ({ fullPath, id, locale })
    );
    expect(rows).toEqual(
      [
        { fullPath: "/news/hidden", id: hidden.id, locale: "en" },
        { fullPath: "/news/story", id: story.id, locale: "en" },
        { fullPath: "/nachrichten/story", id: story.id, locale: "de" },
      ].toSorted((left, right) => left.fullPath.localeCompare(right.fullPath))
    );
    const german2 = await getAllPaths(payload, { locale: "de", under: "/nachrichten" });
    expect(german2.map((row) => row.fullPath)).toEqual(["/nachrichten/story"]);
  });

  it("the REST client returns the same shapes as the helpers", async () => {
    const { config, payload } = harness;
    const { token } = await payload.login({
      collection: "users",
      data: { email: "tree-editor@example.com", password: "test-password" },
    });
    const fetchFromPayload = (input: string, init?: RequestInit) =>
      handleEndpoints({
        config,
        payloadInstanceCacheKey: harness.cacheKey,
        request: new Request(input, init),
      });
    const publicClient = createFoldersClient({
      baseUrl: "http://localhost:4078/",
      fetch: fetchFromPayload,
    });
    const signedInClient = createFoldersClient({
      baseUrl: "http://localhost:4078",
      fetch: fetchFromPayload,
      headers: async () => ({ Authorization: `JWT ${token}` }),
    });

    // resolve: a page, a redirect, nothing.
    for (const path of ["/blog/team", "/Blog/Team", "/blog/none"]) {
      expect(await publicClient.resolve({ depth: 0, path })).toEqual(
        same(await resolvePath(payload, { depth: 0, path }))
      );
    }
    expect(await publicClient.resolve({ path: "/blog/none" })).toEqual({ type: "notFound" });
    expect(await publicClient.resolve({ locale: "de", path: "/blog/team" })).toMatchObject({
      locale: "de",
      type: "page",
    });
    // tree, as a public and as a signed-in reader.
    expect(await publicClient.tree({ depth: 4 })).toEqual(
      same(await getTree(payload, { depth: 4 }))
    );
    expect(await publicClient.tree({ depth: 2, root: site.blog?.id })).toEqual(
      same(await getTree(payload, { depth: 2, root: site.blog?.id }))
    );
    expect(await signedInClient.tree({ draft: true, includeEmptyFolders: true })).toEqual(
      same(await getTree(payload, { draft: true, includeEmptyFolders: true, user: editor }))
    );
    // paths, collected over several requests of two rows each.
    // The endpoint pages by collection and id, the helper sorts by path: same rows, any order.
    const helperRows = await getAllPaths(payload, { locale: "all" });
    expect(helperRows.length).toBeGreaterThan(2);
    expect(byRowKey(await publicClient.paths({ limit: 2, locale: "all" }))).toEqual(
      byRowKey(same(helperRows) as PathRow[])
    );
    expect(byRowKey(await publicClient.paths({ under: "/blog" }))).toEqual(
      byRowKey(same(await getAllPaths(payload, { under: "/blog" })) as PathRow[])
    );
    expect(byRowKey(await signedInClient.paths({ draft: true }))).toEqual(
      byRowKey(same(await getAllPaths(payload, { draft: true, user: editor })) as PathRow[])
    );
    expect(publicClient.toStoryblokFullSlug("/blog", true)).toBe("blog/");
    expect(publicClient.toStoryblokFullSlug("/blog/team", false)).toBe("blog/team");
    expect(publicClient.toStoryblokFullSlug("/", true)).toBe("");
    // A wrong address is an error, never "not found".
    const wrongAddress = createFoldersClient({
      apiRoute: "/nowhere",
      baseUrl: "http://localhost:4078",
      fetch: fetchFromPayload,
    });
    await expect(wrongAddress.resolve({ path: "/blog" })).rejects.toThrow("answered 404");
  });
});

describe("tree and paths endpoints", () => {
  it("answer an anonymous request, page through paths and refuse bad parameters", async () => {
    const { config, payload } = harness;
    const get = <TBody>(path: string) =>
      callEndpoint<TBody>({ anonymous: true, config, path, payload });

    const tree = await get<{ nodes: TreeNode[] }>("/folders-tree/tree?depth=1");
    expect(tree.status).toBe(200);
    expect(titlesOf(tree.body.nodes)).toContain("Blog");
    expect(titlesOf(tree.body.nodes)).not.toContain("Unannounced");
    const subtree = await get<{ nodes: TreeNode[] }>(
      `/folders-tree/tree?root=${site.blog?.id}&depth=3&locale=en`
    );
    expect(titlesOf(subtree.body.nodes)).toEqual(["Blog Home", "2026", "Team"]);

    const first = await get<{ docs: unknown[]; hasNextPage: boolean; page: number }>(
      "/folders-tree/paths?limit=2"
    );
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ hasNextPage: true, page: 1 });
    expect(first.body.docs).toHaveLength(2);
    const last = await get<{ docs: unknown[]; hasNextPage: boolean; page: number }>(
      "/folders-tree/paths?limit=1000&page=1&under=/blog"
    );
    expect(last.body).toMatchObject({ hasNextPage: false, page: 1 });
    expect(last.body.docs).toHaveLength(3);
    const beyond = await get<{ docs: unknown[]; hasNextPage: boolean }>(
      "/folders-tree/paths?limit=2&page=99"
    );
    expect(beyond.body).toMatchObject({ docs: [], hasNextPage: false });

    expect((await get("/folders-tree/tree?depth=-1")).status).toBe(400);
    expect((await get("/folders-tree/tree?root=0")).status).toBe(400);
    expect((await get("/folders-tree/tree?locale=fr")).status).toBe(400);
    expect((await get("/folders-tree/paths?rootPages=sometimes")).status).toBe(400);
    expect((await get("/folders-tree/paths?limit=0")).status).toBe(400);
    expect((await get("/folders-tree/paths?page=0")).status).toBe(400);
    expect((await get("/folders-tree/paths?limit=10001")).status).toBe(400);
  });
});

describe("read endpoint cache headers", () => {
  const endpoints = [
    "/folders-tree/resolve?path=/blog/team",
    "/folders-tree/tree?depth=1",
    "/folders-tree/paths?limit=5",
  ];

  it("every answer varies on the credentials; a signed-in or draft read is never stored", async () => {
    const { config, payload } = harness;
    const headersOf = async (path: string, anonymous: boolean) =>
      (await callEndpoint({ anonymous, config, path, payload })).response.headers;

    for (const endpoint of endpoints) {
      const joiner = endpoint.includes("?") ? "&" : "?";
      const publicRead = await headersOf(endpoint, true);
      expect(publicRead.get("Vary")).toContain("Cookie");
      expect(publicRead.get("Vary")).toContain("Authorization");
      expect(publicRead.get("Cache-Control")).toBeNull();

      for (const [path, anonymous] of [
        [endpoint, false],
        [`${endpoint}${joiner}draft=true`, true],
        [`${endpoint}${joiner}draft=true`, false],
      ] as const) {
        const headers = await headersOf(path, anonymous);

        expect(headers.get("Cache-Control"), path).toBe("private, no-store");
        expect(headers.get("Vary"), path).toContain("Cookie, Authorization");
      }
    }
    // A 404 from resolve carries them too.
    const missing = await callEndpoint({
      anonymous: false,
      config,
      path: "/folders-tree/resolve?path=/no/such/page",
      payload,
    });
    expect(missing.status).toBe(404);
    expect(missing.response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("paths paging", () => {
  type PagedAnswer = { docs: PathRow[]; hasNextPage: boolean; page: number };

  const createPageRow = (folder: number, slug: string) =>
    harness.payload.create({
      collection: "pages",
      data: { _status: "published", folder, slug, title: slug },
      depth: 0,
      overrideAccess: true,
    });

  const walk = async (limit: number, args: { locale?: "all" | "de" | "en"; under: string }) => {
    const collected: PathRow[] = [];
    for (let page = 1; page < 100; page += 1) {
      const answer = await getPathsPage(harness.payload, {
        ...args,
        limit,
        overrideAccess: true,
        page,
      });
      expect(answer.docs.length).toBeLessThanOrEqual(limit * (args.locale === "all" ? 2 : 1));
      collected.push(...answer.docs);
      if (!answer.hasNextPage) {
        return collected;
      }
    }
    throw new Error("the walk did not end");
  };

  it("walking pages of any size lists every page once across two collections", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Walk", slug: "walk" });
    for (let index = 0; index < 7; index += 1) {
      await createArticle({ folder: folder.id, slug: `article-${index}` });
    }
    for (let index = 0; index < 5; index += 1) {
      await createPageRow(folder.id, `page-${index}`);
    }
    const expected = byRowKey(await getAllPaths(payload, { overrideAccess: true, under: "/walk" }));
    expect(expected).toHaveLength(12);

    // Sizes that fall inside a collection, on the boundary between them, and past both.
    for (const limit of [1, 2, 3, 5, 7, 8, 12, 13]) {
      const collected = await walk(limit, { under: "/walk" });

      expect(byRowKey(collected)).toEqual(expected);
      expect(new Set(collected.map((row) => `${row.collection}/${row.id}`)).size).toBe(12);
    }
  });

  it("a deep page reads about one page of rows, not the whole site", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Deep walk", slug: "deep-walk" });
    for (let index = 0; index < 30; index += 1) {
      await createArticle({ folder: folder.id, slug: `item-${index}` });
    }
    for (let index = 0; index < 30; index += 1) {
      await createPageRow(folder.id, `entry-${index}`);
    }
    const adapter = payload.db as unknown as {
      find: (args: unknown) => Promise<{ docs: unknown[] }>;
    };
    const originalFind = adapter.find;
    let rowsRead = 0;
    adapter.find = async function find(this: unknown, args) {
      const result = await originalFind.call(this, args);
      // The folders read is Payload filling `folderPath` of each page query, one row a time.
      if ((args as { collection: string }).collection !== "folders") {
        rowsRead += result.docs.length;
      }

      return result;
    };

    try {
      // Page 9 of 5 starts at row 40, in the second collection.
      const answer = await getPathsPage(payload, {
        limit: 5,
        overrideAccess: true,
        page: 9,
        under: "/deep-walk",
      });

      expect(answer.docs).toHaveLength(5);
      expect(answer.hasNextPage).toBe(true);
      // A probe row for each of two collections, then two database pages of six rows; the site holds 60.
      expect(rowsRead).toBeLessThanOrEqual(2 + 12);
    } finally {
      adapter.find = originalFind;
    }
  });

  it("locale all pages the pages, and each gives a row for every locale it is live in", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Both", slug: "both" });
    for (let index = 0; index < 3; index += 1) {
      await createArticle({ folder: folder.id, slug: `both-${index}` });
    }

    const first = await getPathsPage(payload, {
      limit: 2,
      locale: "all",
      overrideAccess: true,
      page: 1,
      under: "/both",
    });

    expect(first.docs).toHaveLength(4);
    expect(first.docs.map((row) => row.locale)).toEqual(["en", "de", "en", "de"]);
    expect(first.hasNextPage).toBe(true);
    expect(await walk(2, { locale: "all", under: "/both" })).toHaveLength(6);
  });

  it("hasNextPage is false when the last page holds exactly limit rows", async () => {
    const { config, payload } = harness;
    const get = (query: string) =>
      callEndpoint<PagedAnswer>({
        anonymous: true,
        config,
        path: `/folders-tree/paths?${query}`,
        payload,
      });
    const folder = await createFolder(payload, { name: "Exact", slug: "exact" });
    for (let index = 0; index < 3; index += 1) {
      await createArticle({ folder: folder.id, slug: `exact-${index}` });
    }

    const exact = await get("under=/exact&limit=3");
    expect(exact.body.docs).toHaveLength(3);
    expect(exact.body.hasNextPage).toBe(false);
    const short = await get("under=/exact&limit=2");
    expect(short.body.docs).toHaveLength(2);
    expect(short.body.hasNextPage).toBe(true);
    const rest = await get("under=/exact&limit=2&page=2");
    expect(rest.body).toMatchObject({ hasNextPage: false, page: 2 });
    expect(rest.body.docs).toHaveLength(1);
    const one = await get("under=/exact&limit=1&page=3");
    expect(one.body.docs).toHaveLength(1);
    expect(one.body.hasNextPage).toBe(false);
  });

  it("under finds a folder by its path in any locale when locale is all", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { name: "Press", slug: "press" });
    await payload.update({
      collection: "folders",
      data: { name: "Aktuelles", slug: "aktuelles" },
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });
    const story = await createArticle({ folder: folder.id, slug: "meldung" });

    const rows = await getAllPaths(payload, { locale: "all", under: "/aktuelles" });
    expect(rows.map(({ fullPath, id, locale }) => ({ fullPath, id, locale }))).toEqual([
      { fullPath: "/aktuelles/meldung", id: story.id, locale: "de" },
      { fullPath: "/press/meldung", id: story.id, locale: "en" },
    ]);
    // A single locale still reads the path in that locale only.
    expect(await getAllPaths(payload, { locale: "en", under: "/aktuelles" })).toEqual([]);
    expect(
      (await getAllPaths(payload, { locale: "de", under: "/aktuelles" })).map((row) => row.fullPath)
    ).toEqual(["/aktuelles/meldung"]);
    const viaEndpoint = await callEndpoint<PagedAnswer>({
      anonymous: true,
      config,
      path: "/folders-tree/paths?locale=all&under=/aktuelles",
      payload,
    });
    expect(viaEndpoint.body.docs.map((row) => row.locale).toSorted()).toEqual(["de", "en"]);
  });
});

const rowOf = (id: number): PathRow => ({
  collection: "articles",
  fullPath: `/row-${id}`,
  id,
  locale: "en",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const answerWith = (docs: PathRow[], hasNextPage: boolean) =>
  Promise.resolve(Response.json({ docs, hasNextPage, page: 1 }));

describe("REST client paths loop", () => {
  it("stops on an empty page even when the server says there is more", async () => {
    let requests = 0;
    const client = createFoldersClient({
      baseUrl: "http://localhost:4078",
      fetch: () => {
        requests += 1;

        return requests === 1 ? answerWith([rowOf(1)], true) : answerWith([], true);
      },
    });

    const rows = await client.paths();

    expect(rows.map((row) => row.id)).toEqual([1]);
    expect(requests).toBe(2);
  });

  it("gives up with an error after the request cap instead of looping", async () => {
    let requests = 0;
    const client = createFoldersClient({
      baseUrl: "http://localhost:4078",
      fetch: () => {
        requests += 1;

        return answerWith([rowOf(requests)], true);
      },
    });

    await expect(client.paths({ maxRequests: 3 })).rejects.toThrow(FoldersClientError);
    expect(requests).toBe(3);
  });

  it("stops at the page that says there is no next one", async () => {
    let requests = 0;
    const client = createFoldersClient({
      baseUrl: "http://localhost:4078",
      fetch: () => {
        requests += 1;

        return answerWith([rowOf(requests)], requests < 4);
      },
    });

    expect((await client.paths()).map((row) => row.id)).toEqual([1, 2, 3, 4]);
    expect(requests).toBe(4);
  });
});
