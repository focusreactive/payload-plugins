import { describe, expect, it } from "vitest";

import {
  existingRootOf,
  rootChangePreviewOf,
  rootPageBodyOf,
  rootUpdateModeOf,
} from "../../src/admin/ContextMenu/rootPage.js";
import { folderRow, pageRow, stateOf } from "../helpers/treeItems.js";

describe("rootUpdateModeOf", () => {
  it("saves a published page and one in a collection without drafts live", () => {
    expect(rootUpdateModeOf(pageRow(1, "A", 5, { status: "published" }))).toBe("live");
    expect(rootUpdateModeOf(pageRow(1, "A", 5, { status: "live" }))).toBe("live");
  });

  it("saves a draft, and a page with a newer draft, as a draft so nothing unreviewed goes live", () => {
    expect(rootUpdateModeOf(pageRow(1, "A", 5, { status: "draft" }))).toBe("draft");
    expect(rootUpdateModeOf(pageRow(1, "A", 5, { status: "changed" }))).toBe("draft");
  });
});

describe("rootPageBodyOf", () => {
  it("keeps a published page published, and a draft a draft", () => {
    expect(rootPageBodyOf(pageRow(1, "A", 5, { status: "published" }))).toEqual({
      _status: "published",
      isFolderRoot: true,
    });
    expect(rootPageBodyOf(pageRow(1, "A", 5, { status: "draft" }))).toEqual({
      _status: "draft",
      isFolderRoot: true,
    });
  });

  it("sends no status for a collection without drafts", () => {
    expect(rootPageBodyOf(pageRow(1, "A", 5, { status: "live" }))).toEqual({ isFolderRoot: true });
  });
});

describe("existingRootOf", () => {
  const page = pageRow(10, "Contact", 5);

  it("names the root page when it is among the loaded siblings", () => {
    const state = stateOf({
      "5": [pageRow(11, "About Us", 5, { isFolderRoot: true }), page],
      root: [folderRow(5, "Company", null, { hasRootPage: true })],
    });

    expect(existingRootOf(page, state)).toEqual({ title: "About Us" });
  });

  it("falls back to the folder's own flag when the root page is not loaded", () => {
    const state = stateOf({
      "5": [page],
      root: [folderRow(5, "Company", null, { hasRootPage: true })],
    });

    expect(existingRootOf(page, state)).toBe("unknown");
  });

  it("finds none in a folder without a root page", () => {
    const state = stateOf({ "5": [page], root: [folderRow(5, "Company")] });

    expect(existingRootOf(page, state)).toBeNull();
  });

  it("looks at the top level's own pages for a page without a folder", () => {
    const topPage = pageRow(20, "Landing", null);
    const state = stateOf({ root: [pageRow(21, "Home", null, { isFolderRoot: true }), topPage] });

    expect(existingRootOf(topPage, state)).toEqual({ title: "Home" });
  });

  it("does not count the page itself as the folder's root", () => {
    const self = pageRow(10, "Contact", 5, { isFolderRoot: true });
    const state = stateOf({ "5": [self], root: [folderRow(5, "Company")] });

    expect(existingRootOf(self, state)).toBeNull();
  });
});

describe("rootChangePreviewOf", () => {
  it("reads as one published URL that becomes the folder's path", () => {
    const preview = rootChangePreviewOf(
      pageRow(10, "Contact", 5, { fullPath: "/company/contact" }),
      "/company",
      5
    );

    expect(preview.ok).toBe(true);
    expect(preview.urlChanges).toEqual({ draftOnly: 0, published: 1, publishedAcrossLocales: 1 });
    expect(preview.samples).toEqual([
      { collection: "pages", from: "/company/contact", id: 10, locale: null, to: "/company" },
    ]);
  });
});
