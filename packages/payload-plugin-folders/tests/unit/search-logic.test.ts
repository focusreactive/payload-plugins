import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  apiStatusesOf,
  foldersToOpenFor,
  searchPathOf,
  searchRowsOf,
  toggled,
} from "../../src/admin/Search/searchLogic.js";
import { pageRow } from "../helpers/treeItems.js";

describe("search results", () => {
  const folders = { "1": "Blog", "5": "2026" };

  it("name the folders above a hit, top first, from the collection's own title", () => {
    expect(searchPathOf({ ancestorIds: "/1/5/" }, folders, "Content")).toEqual([
      "Content",
      "Blog",
      "2026",
    ]);
    expect(searchPathOf({ ancestorIds: "/" }, folders, "Content")).toEqual(["Content"]);
    expect(searchPathOf({}, folders, "Content")).toEqual(["Content"]);
  });

  it("skip a folder the endpoint did not name", () => {
    expect(searchPathOf({ ancestorIds: "/1/9/5/" }, folders, "Content")).toEqual([
      "Content",
      "Blog",
      "2026",
    ]);
  });

  it("become flat rows with their place in the list", () => {
    const rows = searchRowsOf(
      [pageRow(3, "New Year", 5, { ancestorIds: "/1/5/" }), pageRow(4, "Other", 1)],
      folders,
      "Content"
    );

    expect(rows.map((row) => [row.key, row.level, row.posInSet, row.setSize])).toEqual([
      ["pages:3", 0, 1, 2],
      ["pages:4", 0, 2, 2],
    ]);
    expect(rows[0]?.searchPath).toEqual(["Content", "Blog", "2026"]);
    expect(rows.every((row) => !row.expandable && !row.expanded)).toBe(true);
  });
});

describe("the folders to open for a hit", () => {
  it("are all of its ancestors from the top level", () => {
    expect(foldersToOpenFor({ ancestorIds: "/1/5/" }, null)).toEqual(["1", "5"]);
  });

  it("are the ones below the zoomed folder", () => {
    expect(foldersToOpenFor({ ancestorIds: "/1/5/7/" }, 1)).toEqual(["5", "7"]);
    expect(foldersToOpenFor({ ancestorIds: "/1/5/" }, "5")).toEqual([]);
  });

  it("are unknown for a hit outside the zoomed folder, which the tree has to zoom out for", () => {
    expect(foldersToOpenFor({ ancestorIds: "/2/6/" }, 1)).toBeNull();
  });
});

describe("the filters", () => {
  it("send Published as published and live, the status of a collection without drafts", () => {
    expect(apiStatusesOf([])).toBeUndefined();
    expect(apiStatusesOf(["draft"])).toEqual(["draft"]);
    expect(apiStatusesOf(["published", "changed"])).toEqual(["published", "live", "changed"]);
  });

  it("count the choices made", () => {
    expect(activeFilterCount({ statuses: ["draft"], types: ["pages", "posts"] })).toBe(3);
    expect(activeFilterCount({ statuses: [], types: [] })).toBe(0);
  });

  it("toggle a choice on and off", () => {
    expect(toggled(["a"], "b")).toEqual(["a", "b"]);
    expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  });
});
