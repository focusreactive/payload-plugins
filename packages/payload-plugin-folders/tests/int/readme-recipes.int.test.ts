import { readFileSync } from "node:fs";

import { buildSegmentWhere } from "@focus-reactive/payload-plugin-folders";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { runGraphql } from "../helpers/runGraphql.js";
import { createFolder } from "../helpers/treeFixtures.js";

// The stock-query recipes of the README ("Reading content with stock queries"), each run the way the
// README writes it: over REST, over GraphQL and through the Local API.

let harness: TestPayload;
let blogId: number;
let newsId: number;
const ids: Record<string, number> = {};

type Docs = { docs: Array<{ folderPath?: string | null; id: number; orderKey?: string }> };

const readmeText = readFileSync(new URL("../../README.md", import.meta.url), "utf-8");

// The REST column of a "Stock queries" row, as the README writes it, so that a row the README gets
// wrong fails here. A `GET /api/<path>` row becomes the path the test endpoint takes; a row that is
// only a `where` is given the collection it applies to.
const readmeQuery = (
  needStart: string,
  collection: string,
  replacements: Record<string, string> = {}
) => {
  const row = readmeText.split("\n").find((line) => line.startsWith(`| ${needStart}`));
  if (!row) {
    throw new Error(`README has no stock query row starting with "${needStart}"`);
  }
  const [, restCell = ""] = row.split(" | ");
  const code = /`([^`]+)`/u.exec(restCell)?.[1] ?? "";
  let query = code;
  for (const [placeholder, value] of Object.entries(replacements)) {
    query = query.replaceAll(placeholder, value);
  }

  return query.startsWith("GET /api") ? query.slice("GET /api".length) : `/${collection}?${query}`;
};

const createPage = async (
  key: string,
  data: { folder: number | null; isFolderRoot?: boolean; published?: boolean; slug: string }
) => {
  const { payload } = harness;
  const { published = true, ...rest } = data;
  const page = await payload.create({
    collection: "pages",
    data: { ...rest, _status: published ? "published" : "draft", title: key },
    depth: 0,
    overrideAccess: true,
  });
  ids[key] = page.id;
};

beforeAll(async () => {
  harness = await getTestPayload();
  const { payload } = harness;
  const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
  const news = await createFolder(payload, { name: "News", parent: blog.id, slug: "2026" });
  blogId = blog.id;
  newsId = news.id;
  await payload.update({
    collection: "folders",
    data: { name: "Aktuelles", slug: "aktuelles" },
    id: blog.id,
    locale: "de",
    overrideAccess: true,
  });
  await createPage("home", { folder: null, isFolderRoot: true, slug: "home" });
  await createPage("about", { folder: null, slug: "about" });
  await createPage("blogHome", { folder: blog.id, isFolderRoot: true, slug: "blog-home" });
  await createPage("post", { folder: blog.id, slug: "post" });
  await createPage("draftPost", { folder: blog.id, published: false, slug: "draft-post" });
  await createPage("newYear", { folder: news.id, slug: "new-year" });
  await payload.update({
    collection: "pages",
    data: { slug: "beitrag", title: "Beitrag" },
    id: ids.post,
    locale: "de",
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

const rest = (path: string, options: { anonymous?: boolean } = {}) =>
  callEndpoint<Docs>({ config: harness.config, path, payload: harness.payload, ...options });

const idsOf = (body: Docs) =>
  body.docs.map((doc) => doc.id).sort((first, second) => first - second);
const idsFrom = (data: unknown) =>
  (data as { Pages: { docs: Array<{ id: number }> } }).Pages.docs
    .map((doc) => doc.id)
    .sort((first, second) => first - second);
const sorted = (...values: number[]) => values.sort((first, second) => first - second);

// The README's segment clause for a non-default locale, over REST.
const segmentClause = (segment: string) =>
  `&where[or][0][pathSegment][equals]=${segment}` +
  `&where[or][1][and][0][pathSegment][exists]=false&where[or][1][and][1][pathSegment.en][equals]=${segment}`;
describe("stock query recipes", () => {
  it("page by URL in de, over REST and the Local API", async () => {
    // /aktuelles/2026/new-year: the page has no German segment of its own, so it answers to the
    // English one, and its folders are translated.
    const newYearWhere =
      `locale=de&where[folderPath][equals]=/aktuelles/2026&where[isFolderRoot][not_equals]=true` +
      segmentClause("new-year");
    expect(idsOf((await rest(`/pages?${newYearWhere}`)).body)).toEqual([ids.newYear]);

    // The table row as the README writes it, with the segment clause appended: the page has a German
    // segment of its own, `beitrag`.
    const pageRow = readmeQuery("Page by URL", "pages");
    expect(idsOf((await rest(`${pageRow}${segmentClause("beitrag")}`)).body)).toEqual([ids.post]);

    const { docs } = await harness.payload.find({
      collection: "pages",
      locale: "de",
      overrideAccess: true,
      where: {
        and: [
          { folderPath: { equals: "/aktuelles" } },
          { isFolderRoot: { not_equals: true } },
          buildSegmentWhere({ defaultLocale: "en", locale: "de", segment: "beitrag" }),
        ],
      },
    });
    expect(docs.map((doc) => doc.id)).toEqual([ids.post]);
  });

  it("page at the top level, root page of a folder, site root page", async () => {
    expect(idsOf((await rest(readmeQuery("Page at the top level", "pages"))).body)).toEqual([
      ids.about,
    ]);
    expect(idsOf((await rest(readmeQuery("Root page of", "pages"))).body)).toEqual([ids.blogHome]);
    expect(idsOf((await rest(readmeQuery("Site root page", "pages"))).body)).toEqual([ids.home]);
  });

  it("published only", async () => {
    const all = await rest(`/pages?where[folder][equals]=${blogId}&depth=0`);
    expect(idsOf(all.body)).toEqual(sorted(ids.blogHome, ids.post, ids.draftPost));
    const published = await rest(
      `/pages?where[folder][equals]=${blogId}&where[_status][equals]=published`
    );
    expect(idsOf(published.body)).toEqual(sorted(ids.blogHome, ids.post));
  });

  it("everything under /blog, by folder id and by ancestor ids", async () => {
    const everything = sorted(ids.blogHome, ids.post, ids.draftPost, ids.newYear);
    const byIds = await rest(readmeQuery("Everything under", "pages", { "<id>": String(blogId) }));
    expect(idsOf(byIds.body)).toEqual(everything);

    const { docs } = await harness.payload.find({
      collection: "pages",
      overrideAccess: true,
      where: {
        or: [{ folder: { equals: blogId } }, { "folder.ancestorIds": { contains: `/${blogId}/` } }],
      },
    });
    expect(docs.map((doc) => doc.id).sort((first, second) => first - second)).toEqual(everything);
  });

  it("folder by full path and folder subtree", async () => {
    const byPath = await rest(readmeQuery("Folder by full path", "folders"), { anonymous: true });
    expect(idsOf(byPath.body)).toEqual([blogId]);
    const subtree = await rest(
      readmeQuery("Folder subtree", "folders", { "<id>": String(blogId) }),
      { anonymous: true }
    );
    expect(idsOf(subtree.body)).toEqual([newsId]);
  });

  it("pages in one folder in tree order, and a list sorted by folder path", async () => {
    const inOrder = await rest(
      readmeQuery("Pages in one folder", "pages", { "<id>": String(blogId) })
    );
    const keys = inOrder.body.docs.map((doc) => doc.orderKey ?? "");
    expect(keys).toHaveLength(3);
    expect(keys).toEqual([...keys].sort());
    const byPath = await rest(`${readmeQuery("Sort a list", "pages")}&limit=50`);
    expect(byPath.status).toBe(200);
    // Pages without a folder have a null path, which databases sort first or last, so only the
    // pages in folders are compared.
    const folderPaths = byPath.body.docs
      .map((doc) => doc.folderPath)
      .filter(
        (folderPath): folderPath is string => typeof folderPath === "string" && folderPath !== ""
      );
    expect(folderPaths).toEqual(["/blog", "/blog", "/blog", "/blog/2026"]);
    const descending = await rest(`/pages?sort=-folderPath&limit=50`);
    expect(
      descending.body.docs
        .map((doc) => doc.folderPath)
        .filter(
          (folderPath): folderPath is string => typeof folderPath === "string" && folderPath !== ""
        )
    ).toEqual(["/blog/2026", "/blog", "/blog", "/blog"]);
  });

  it("a page's URL is fullPath on any read", async () => {
    const { docs } = await harness.payload.find({
      collection: "pages",
      depth: 0,
      locale: "de",
      overrideAccess: true,
      where: { id: { equals: ids.newYear } },
    });
    expect(docs[0]).toMatchObject({ fullPath: "/aktuelles/2026/new-year" });
  });

  it("GraphQL: folderPath, folder exists, subtree", async () => {
    const { payload } = harness;
    const user = await payload.create({
      collection: "users",
      data: { email: "readme-recipes@example.com", password: "test-password", role: "admin" },
      overrideAccess: true,
    });
    const run = (query: string) => runGraphql(harness, user, query);
    const inBlog = await run(
      `{ Pages(where: { folderPath: { equals: "/blog" }, isFolderRoot: { not_equals: true } }) { docs { id fullPath } } }`
    );
    expect(inBlog.invalid).toBeUndefined();
    expect(idsFrom(inBlog.data)).toEqual(sorted(ids.post, ids.draftPost));

    const topLevel = await run(
      `{ Pages(where: { folder: { exists: false }, pathSegment: { equals: "about" }, isFolderRoot: { not_equals: true } }) { docs { id } } }`
    );
    expect(topLevel.invalid).toBeUndefined();
    expect(idsFrom(topLevel.data)).toEqual([ids.about]);

    const subfolders = await run(
      `{ Folders(where: { ancestorIds: { contains: "/${blogId}/" } }) { docs { id } } }`
    );
    expect(subfolders.invalid).toBeUndefined();
    const folderIds = [
      blogId,
      ...(subfolders.data as { Folders: { docs: Array<{ id: number }> } }).Folders.docs.map(
        (doc) => doc.id
      ),
    ];
    const subtree = await run(
      `{ Pages(where: { folder: { in: [${folderIds.join(", ")}] } }) { docs { id } } }`
    );
    expect(subtree.invalid).toBeUndefined();
    expect(idsFrom(subtree.data)).toEqual(
      sorted(ids.blogHome, ids.post, ids.draftPost, ids.newYear)
    );

    const published = await run(
      `{ Pages(where: { folder: { equals: ${blogId} }, _status: { equals: published } }) { docs { id } } }`
    );
    expect(published.invalid).toBeUndefined();
    expect(idsFrom(published.data)).toEqual(sorted(ids.blogHome, ids.post));
  });

  it("redirect rows by lookup key", async () => {
    const { payload } = harness;
    await payload.update({
      collection: "folders",
      data: { name: "Blog", slug: "journal" },
      id: blogId,
      overrideAccess: true,
    });
    const rows = await callEndpoint<{ docs: Array<{ lookupKey: string }> }>({
      config: harness.config,
      path: "/folder-redirects?where[lookupKey][in]=en:/blog/post,en:/blog",
      payload,
    });
    expect(rows.status).toBe(200);
    expect(rows.body.docs.map((doc) => doc.lookupKey)).toContain("en:/blog");
  });
});
