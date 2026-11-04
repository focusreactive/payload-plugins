import { describe, expect, it } from "vitest";

import { fetchAncestors, fetchChildren, fetchSearch } from "../../src/admin/api.js";
import { createTreeStore } from "../../src/admin/store.js";
import { untitledTitle } from "../../src/core/untitled.js";
import type { TreeItem } from "../../src/types.js";
import { de } from "../../src/translations/de.js";
import { en } from "../../src/translations/en.js";

const allowed = { delete: true, publish: true, update: true };

const pageRow = (id: number, title: string): TreeItem => ({
  access: allowed,
  collection: "pages",
  depth: 0,
  fullPath: `/page-${id}`,
  id,
  kind: "page",
  orderKey: null,
  parentId: null,
  slug: `page-${id}`,
  slugIsFallback: false,
  status: "published",
  structureRevision: 0,
  title,
  titleIsFallback: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const folderRow: TreeItem = {
  access: allowed,
  childCount: 0,
  collection: "folders",
  depth: 0,
  fullPath: "/blog",
  hasRootPage: false,
  id: 9,
  kind: "folder",
  orderKey: null,
  parentId: null,
  slug: "blog",
  slugIsFallback: false,
  structureRevision: 0,
  title: untitledTitle,
  titleIsFallback: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const rows = [pageRow(1, untitledTitle), pageRow(2, "About"), folderRow];

/** Answers every endpoint the three reads call, with the rows as the server sends them. */
const fetchImplementation: typeof fetch = (input) => {
  const { pathname } = new URL(String(input), "http://localhost");
  if (pathname.endsWith("/children")) {
    return Promise.resolve(
      Response.json({ hasMore: false, items: rows, nextCursor: null, revision: 1 })
    );
  }
  if (pathname.endsWith("/search")) {
    return Promise.resolve(Response.json({ folders: {}, items: rows, truncated: false }));
  }

  return Promise.resolve(Response.json({ folders: [], item: rows[0], items: rows }));
};

const germanWord = de.foldersTree.untitledPage;
const germanContext = { baseUrl: "/api", fetchImplementation, untitledTitle: germanWord };

const titlesOf = (items: TreeItem[] | undefined) => items?.map((item) => item.title);

describe("the title of a page that has none, in the German admin", () => {
  it("is a German word, not the server's English one", () => {
    expect(germanWord).not.toBe(untitledTitle);
    expect(en.foldersTree.untitledPage).toBe(untitledTitle);
  });

  it("replaces it in a children read, and leaves a folder and a real title alone", async () => {
    const { items } = await fetchChildren(germanContext, { parent: null });

    expect(titlesOf(items)).toEqual([germanWord, "About", untitledTitle]);
  });

  it("replaces it in search hits", async () => {
    const { items } = await fetchSearch(germanContext, { folder: null, query: "a" });

    expect(titlesOf(items)).toEqual([germanWord, "About", untitledTitle]);
  });

  it("replaces it in the rows of an ancestors read", async () => {
    const response = await fetchAncestors(germanContext, {
      item: { collection: "pages", id: 1 },
      withItems: true,
    });

    expect(titlesOf(response.items)).toEqual([germanWord, "About", untitledTitle]);
    expect(response.item?.title).toBe(germanWord);
  });

  it("keeps the server's word when the admin gave none", async () => {
    const { items } = await fetchChildren(
      { baseUrl: "/api", fetchImplementation },
      { parent: null }
    );

    expect(titlesOf(items)).toEqual([untitledTitle, "About", untitledTitle]);
  });

  it("shows in the rows a configured tree store holds", async () => {
    const store = createTreeStore();
    store.configure({
      baseUrl: "/api",
      fetchImplementation,
      locale: null,
      pageSize: 50,
      untitledTitle: germanWord,
    });
    await store.loadChildren(null);

    const loaded = Object.values(store.getState().childrenByFolder).flatMap((entry) => entry.items);

    expect(titlesOf(loaded)).toEqual([germanWord, "About", untitledTitle]);
  });
});
