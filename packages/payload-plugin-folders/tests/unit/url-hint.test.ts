import { describe, expect, it } from "vitest";

import { composeFullPath } from "../../src/core/paths.js";
import { urlChangeOf } from "../../src/admin/Settings/urlHint.js";

describe("composeFullPath, a page's path from its form values", () => {
  it("joins the folder's path and the segment", () => {
    expect(composeFullPath({ folderPath: "/blog/2026", isFolderRoot: false, segment: "y" })).toBe(
      "/blog/2026/y"
    );
  });

  it("puts a page at the top level when its folder is the top level", () => {
    expect(composeFullPath({ folderPath: "/", isFolderRoot: false, segment: "about" })).toBe(
      "/about"
    );
    expect(composeFullPath({ folderPath: "", isFolderRoot: false, segment: "about" })).toBe(
      "/about"
    );
  });

  it("gives a root page its folder's path, whatever its segment says", () => {
    expect(
      composeFullPath({ folderPath: "/company", isFolderRoot: true, segment: "about-us" })
    ).toBe("/company");
    expect(composeFullPath({ folderPath: "", isFolderRoot: true, segment: "" })).toBe("/");
  });

  it("has no path for a page without a segment", () => {
    expect(composeFullPath({ folderPath: "/blog", isFolderRoot: false, segment: "" })).toBeNull();
  });

  it("lowercases and tidies the way every stored path is", () => {
    expect(composeFullPath({ folderPath: "/Blog/", isFolderRoot: false, segment: "Y" })).toBe(
      "/blog/y"
    );
  });
});

describe("urlChangeOf, the edit view's 'URL will change from /a/b to /a/c' hint", () => {
  const stored = { folderPath: "/blog", isFolderRoot: false, segment: "b" };

  it("names the old and the new URL when the segment is edited", () => {
    expect(urlChangeOf(stored, { ...stored, segment: "c" })).toEqual({
      from: "/blog/b",
      to: "/blog/c",
    });
  });

  it("says nothing while the form still holds what is stored", () => {
    expect(urlChangeOf(stored, stored)).toBeNull();
  });

  it("says nothing while the segment is empty, because a page with no segment has no URL", () => {
    expect(urlChangeOf(stored, { ...stored, segment: "" })).toBeNull();
    expect(urlChangeOf({ ...stored, segment: "" }, { ...stored, segment: "c" })).toBeNull();
  });

  it("follows the root flag: a ticked box puts the page at its folder's path", () => {
    expect(urlChangeOf(stored, { ...stored, isFolderRoot: true })).toEqual({
      from: "/blog/b",
      to: "/blog",
    });
    expect(
      urlChangeOf({ ...stored, isFolderRoot: true }, { ...stored, isFolderRoot: false })
    ).toEqual({
      from: "/blog",
      to: "/blog/b",
    });
  });

  it("ignores an edited segment on a root page, which is not part of its URL", () => {
    const root = { ...stored, isFolderRoot: true };

    expect(urlChangeOf(root, { ...root, segment: "other" })).toBeNull();
  });
});
