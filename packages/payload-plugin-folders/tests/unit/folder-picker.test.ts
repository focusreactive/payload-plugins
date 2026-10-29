import { describe, expect, it } from "vitest";

import { pickerRowsOf, refusalOf } from "../../src/admin/Move/folderPicker.js";
import type { PickerRow } from "../../src/admin/Move/folderPicker.js";
import { createTreeStore, rootKey } from "../../src/admin/store.js";
import type { TreeStoreState } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const item = (
  overrides: Partial<TreeItem> & Pick<TreeItem, "id" | "kind" | "title">
): TreeItem => ({
  access: allowed,
  collection: overrides.kind === "folder" ? "folders" : "pages",
  depth: 0,
  fullPath: `/${overrides.title.toLowerCase()}`,
  orderKey: null,
  parentId: null,
  slug: overrides.title.toLowerCase(),
  slugIsFallback: false,
  structureRevision: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("refusalOf", () => {
  const typeLabels = { pages: "Page", posts: "Blog post" };
  const options = { enforceAllowedTypes: true, typeLabels };
  const blog = item({ ancestorIds: "/", id: 10, kind: "folder", title: "Blog" });
  const year = item({ ancestorIds: "/10/", id: 11, kind: "folder", parentId: 10, title: "2026" });
  const archive = item({ ancestorIds: "/", id: 12, kind: "folder", title: "Archive" });

  it("takes the top level for anything", () => {
    expect(refusalOf([blog], null, options)).toBeNull();
  });

  it("refuses a folder as its own target and every folder below it", () => {
    expect(refusalOf([blog], blog, options)).toEqual({ kind: "cycle" });
    expect(refusalOf([blog], year, options)).toEqual({ kind: "cycle" });
    expect(refusalOf([blog], archive, options)).toBeNull();
  });

  it("does not mistake a page for the folder with the same id", () => {
    const pageWithSameId = item({ id: 10, kind: "page", title: "Same id" });

    expect(refusalOf([pageWithSameId], blog, options)).toBeNull();
  });

  it("allows the folder a page is already in, which is a reorder", () => {
    const child = item({ id: 5, kind: "page", parentId: 10, title: "Child" });

    expect(refusalOf([child], blog, options)).toBeNull();
  });

  it("refuses a page type the folder does not accept, with the labels in the reason", () => {
    const restricted = item({
      allowedTypes: ["posts"],
      ancestorIds: "/10/",
      fullPath: "/blog/2026",
      id: 11,
      kind: "folder",
      parentId: 10,
      title: "2026",
    });
    const pageToMove = item({ id: 6, kind: "page", title: "Plain" });
    const postToMove = item({ collection: "posts", id: 7, kind: "page", title: "Post" });

    expect(refusalOf([pageToMove], restricted, options)).toEqual({
      kind: "type",
      path: "/blog/2026",
      types: ["Blog post"],
    });
    expect(refusalOf([postToMove], restricted, options)).toBeNull();
    // With enforcement off the server only warns, so the picker does not refuse.
    expect(
      refusalOf([pageToMove], restricted, { enforceAllowedTypes: false, typeLabels })
    ).toBeNull();
  });
});

const entry = (items: TreeItem[], hasMore = false) => ({
  error: null,
  hasMore,
  items,
  loadingMore: false,
  nextCursor: hasMore ? "100" : null,
  phase: "loaded" as const,
  refreshing: false,
  revision: 1,
  stale: false,
});
const titles = (rows: PickerRow[]) =>
  rows.filter((row) => row.kind === "folder").map((row) => row.title);

describe("pickerRowsOf", () => {
  const blog = item({ childCount: 2, id: 10, kind: "folder", title: "Blog" });
  const news = item({ childCount: 0, id: 11, kind: "folder", title: "News" });
  const hello = item({ id: 1, kind: "page", parentId: null, title: "Hello" });
  const year = item({ childCount: 1, id: 12, kind: "folder", parentId: 10, title: "2026" });
  const state: TreeStoreState = {
    childrenByFolder: {
      [rootKey]: entry([hello, blog, news]),
      "10": entry([item({ id: 2, kind: "page", parentId: 10, title: "Post" }), year]),
    },
    expanded: [],
    revision: 1,
  };

  it("lists the top level and the folders of the top level, never a page", () => {
    const rows = pickerRowsOf(state, new Set(), "Content (top level)");

    expect(titles(rows)).toEqual(["Content (top level)", "Blog", "News"]);
  });

  it("shows the folders of an opened folder under it, and its own open state, not the tree's", () => {
    const rows = pickerRowsOf(state, new Set(["10"]), "Content (top level)");

    expect(titles(rows)).toEqual(["Content (top level)", "Blog", "2026", "News"]);
    const blogRow = rows.find((row) => row.kind === "folder" && row.title === "Blog");
    expect(blogRow).toMatchObject({ expanded: true, level: 1 });
    // The store's own list of open folders was not asked.
    expect(createTreeStore().getState().expanded).toEqual([]);
  });

  it("marks a folder with nothing inside as not expandable", () => {
    const rows = pickerRowsOf(state, new Set(), "Content (top level)");

    expect(rows.find((row) => row.kind === "folder" && row.title === "News")).toMatchObject({
      expandable: false,
    });
  });

  it("says so when an opened folder has no subfolders, and offers more when it has more", () => {
    const withMore: TreeStoreState = {
      ...state,
      childrenByFolder: {
        ...state.childrenByFolder,
        "10": entry([item({ id: 2, kind: "page", parentId: 10, title: "Post" })], true),
      },
    };

    expect(pickerRowsOf(state, new Set(), "Top").some((row) => row.kind === "empty")).toBe(false);
    const rows = pickerRowsOf(withMore, new Set(["10"]), "Top");
    expect(rows.some((row) => row.kind === "load-more")).toBe(true);
    expect(rows.some((row) => row.kind === "empty")).toBe(false);
  });
});
