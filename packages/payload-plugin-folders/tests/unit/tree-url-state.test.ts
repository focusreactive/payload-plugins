import { describe, expect, it } from "vitest";

import {
  expandedPreferenceKey,
  formatExpandedParam,
  maxExpandedInUrl,
  parseExpandedParam,
  parseFolderParam,
  queryWith,
  savedExpandedOf,
} from "../../src/admin/TreeView/treeUrlState.js";

describe("parseFolderParam", () => {
  it("reads a number id as a number, because the move requests send it back", () => {
    expect(parseFolderParam("42")).toBe(42);
  });

  it("keeps a text id, and a number-looking text that is not the canonical number", () => {
    expect(parseFolderParam("abc-1")).toBe("abc-1");
    expect(parseFolderParam("007")).toBe("007");
  });

  it("answers null for no zoom and for anything that is not an id", () => {
    expect(parseFolderParam(null)).toBeNull();
    expect(parseFolderParam("")).toBeNull();
    expect(parseFolderParam("1,2")).toBeNull();
    expect(parseFolderParam("../admin")).toBeNull();
    expect(parseFolderParam("a b")).toBeNull();
  });
});

describe("parseExpandedParam and formatExpandedParam", () => {
  it("round trips the open folders in order", () => {
    expect(parseExpandedParam("6,7,12")).toEqual([6, 7, 12]);
    expect(formatExpandedParam([6, 7, 12])).toBe("6,7,12");
  });

  it("tells an address with no list from one with an empty list", () => {
    // `null` lets the saved preference decide; an empty list says every folder is closed.
    expect(parseExpandedParam(null)).toBeNull();
    expect(parseExpandedParam("")).toEqual([]);
  });

  it("drops what is not an id and a folder named twice", () => {
    expect(parseExpandedParam("6,,x y,6,<b>,7")).toEqual([6, 7]);
  });

  it("keeps the newest folders when there are more than an address should carry", () => {
    const many = Array.from({ length: maxExpandedInUrl + 5 }, (_, index) => index + 1);

    const written = formatExpandedParam(many).split(",").map(Number);

    expect(written).toHaveLength(maxExpandedInUrl);
    expect(written.at(-1)).toBe(maxExpandedInUrl + 5);
    expect(written[0]).toBe(6);
  });

  it("writes nothing for no open folder", () => {
    expect(formatExpandedParam([])).toBe("");
  });
});

describe("queryWith", () => {
  it("sets a parameter and keeps the others, the list view's own included", () => {
    expect(queryWith("?limit=10&expanded=6", { folder: "7" })).toBe(
      "?limit=10&expanded=6&folder=7"
    );
  });

  it("replaces a parameter in place", () => {
    expect(queryWith("?folder=7&limit=10", { folder: "8" })).toBe("?folder=8&limit=10");
  });

  it("removes a parameter set to null or to an empty value", () => {
    expect(queryWith("?folder=7&limit=10", { folder: null })).toBe("?limit=10");
    expect(queryWith("?expanded=6", { expanded: "" })).toBe("");
  });

  it("works from an address with no query", () => {
    expect(queryWith("", { folder: "7" })).toBe("?folder=7");
    expect(queryWith("", { folder: null })).toBe("");
  });

  it("encodes what it writes", () => {
    expect(queryWith("", { expanded: "6,7" })).toBe("?expanded=6%2C7");
  });
});

describe("savedExpandedOf", () => {
  it("reads the list the preference stores", () => {
    expect(savedExpandedOf({ expanded: ["6", "7"] })).toEqual([6, 7]);
    expect(savedExpandedOf({ expanded: [6, 7] })).toEqual([6, 7]);
  });

  it("answers null for a preference that is missing or not ours", () => {
    expect(savedExpandedOf(null)).toBeNull();
    expect(savedExpandedOf(undefined)).toBeNull();
    expect(savedExpandedOf("6,7")).toBeNull();
    expect(savedExpandedOf({})).toBeNull();
    expect(savedExpandedOf({ expanded: "6,7" })).toBeNull();
  });

  it("skips entries that are not ids", () => {
    expect(savedExpandedOf({ expanded: ["6", null, { id: 1 }, "x y", 7] })).toEqual([6, 7]);
  });

  it("is stored under a key of its own", () => {
    expect(expandedPreferenceKey).toBe("foldersTree.expanded");
  });
});
