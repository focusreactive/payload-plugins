import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "../../src/admin/Tree/relativeTime.js";
import { pathDisplayOf } from "../../src/admin/Tree/rowDisplay.js";
import { flattenTree } from "../../src/admin/Tree/useTreeData.js";
import type { ChildrenEntry, TreeStoreState } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const folder = (id: number, title: string, childCount: number): TreeItem => ({
  access: allowed,
  childCount,
  collection: "folders",
  depth: 1,
  fullPath: `/${title.toLowerCase()}`,
  hasRootPage: false,
  id,
  kind: "folder",
  orderKey: null,
  parentId: null,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const page = (id: number, title: string, overrides: Partial<TreeItem> = {}): TreeItem => ({
  access: allowed,
  collection: "pages",
  depth: 1,
  fullPath: `/${title.toLowerCase()}`,
  id,
  kind: "page",
  orderKey: null,
  parentId: null,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  status: "published",
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const loaded = (items: TreeItem[], overrides: Partial<ChildrenEntry> = {}): ChildrenEntry => ({
  error: null,
  hasMore: false,
  items,
  loadingMore: false,
  nextCursor: null,
  phase: "loaded",
  stale: false,
  ...overrides,
});

const stateOf = (
  childrenByFolder: TreeStoreState["childrenByFolder"],
  expanded: string[] = []
): TreeStoreState => ({ childrenByFolder, expanded, revision: 1 });

const summary = (state: TreeStoreState) =>
  flattenTree(state).map((row) =>
    row.type === "item" ? `${row.level}:${row.item.title}` : `${row.type}@${row.level}`
  );

describe("flattenTree", () => {
  it("lists an opened folder's rows right under it, one level deeper", () => {
    const state = stateOf(
      {
        "10": loaded([page(1, "Alpha"), folder(11, "Inner", 1)]),
        "11": loaded([page(2, "Deep")]),
        root: loaded([folder(10, "Blog", 2), folder(12, "Other", 1)]),
      },
      ["10", "11"]
    );

    expect(summary(state)).toEqual(["0:Blog", "1:Alpha", "1:Inner", "2:Deep", "0:Other"]);
  });

  it("shows a loading row for an opened folder whose rows are not here yet", () => {
    const state = stateOf({ root: loaded([folder(10, "Blog", 2)]) }, ["10"]);

    expect(summary(state)).toEqual(["0:Blog", "loading@1"]);
  });

  it("shows a loading row for the top level before it is read", () => {
    expect(summary(stateOf({}))).toEqual(["loading@0"]);
  });

  it("ends a folder that has more rows with a load-more row", () => {
    const state = stateOf({
      root: loaded([page(1, "Alpha")], { hasMore: true, nextCursor: "abc" }),
    });

    expect(summary(state)).toEqual(["0:Alpha", "load-more@0"]);
  });

  it("shows an error row, with the message, for a folder whose first read failed", () => {
    const state = stateOf({
      root: { ...loaded([]), error: "The server is down", phase: "error" },
    });

    const [row] = flattenTree(state);

    expect(row).toMatchObject({ message: "The server is down", type: "error" });
  });

  it("does not open a folder with nothing in it", () => {
    const state = stateOf({ root: loaded([folder(10, "Empty", 0)]) }, ["10"]);

    const [row] = flattenTree(state);

    expect(row).toMatchObject({ expandable: false, expanded: false, type: "item" });
    expect(summary(state)).toEqual(["0:Empty"]);
  });

  it("opens a folder whose count says empty but whose rows were loaded", () => {
    const state = stateOf(
      { "10": loaded([page(1, "Alpha")]), root: loaded([folder(10, "Blog", 0)]) },
      ["10"]
    );

    expect(summary(state)).toEqual(["0:Blog", "1:Alpha"]);
  });

  it("places a page with an unknown depth by where it is listed", () => {
    // A page in a folder the user cannot read: no path and no depth (PROGRESS decision 26).
    const unknown = page(1, "Hidden", { depth: null, fullPath: "" });
    const state = stateOf({ "10": loaded([unknown]), root: loaded([folder(10, "Blog", 1)]) }, [
      "10",
    ]);

    expect(summary(state)).toEqual(["0:Blog", "1:Hidden"]);
  });

  it("never loops over a folder that lists itself", () => {
    const state = stateOf(
      { "10": loaded([folder(10, "Blog", 1)]), root: loaded([folder(10, "Blog", 1)]) },
      ["10"]
    );

    expect(summary(state)).toEqual(["0:Blog", "1:Blog"]);
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-06-15T12:00:00.000Z");

  it("uses the largest whole unit that fits", () => {
    expect(formatRelativeTime("2026-06-15T11:59:50.000Z", "en", now)).toBe("now");
    expect(formatRelativeTime("2026-06-15T11:00:00.000Z", "en", now)).toBe("1 hour ago");
    expect(formatRelativeTime("2026-06-12T12:00:00.000Z", "en", now)).toBe("3 days ago");
    expect(formatRelativeTime("2026-06-14T12:00:00.000Z", "en", now)).toBe("yesterday");
  });

  it("follows the admin language and survives one it does not know", () => {
    expect(formatRelativeTime("2026-06-12T12:00:00.000Z", "de", now)).toBe("vor 3 Tagen");
    expect(formatRelativeTime("2026-06-12T12:00:00.000Z", "not a language", now)).toBe(
      "3 days ago"
    );
  });

  it("answers an empty string for a date it cannot read", () => {
    expect(formatRelativeTime("never", "en", now)).toBe("");
  });
});

describe("pathDisplayOf", () => {
  it("shows the path of a row that has one", () => {
    expect(pathDisplayOf(page(1, "Alpha"))).toBe("path");
  });

  it("says a page has no URL yet when it has no segment in the locale", () => {
    expect(pathDisplayOf(page(1, "Draft", { fullPath: "" }))).toBe("missing");
  });

  it("shows nothing for a page whose folder the user cannot read", () => {
    // Decision 26: empty path and no depth. Saying "No URL yet" would be a claim about the page.
    expect(pathDisplayOf(page(1, "Hidden", { depth: null, fullPath: "" }))).toBe("unknown");
  });
});
