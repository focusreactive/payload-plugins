import { describe, expect, it } from "vitest";

import { isForDocument, rowPathCandidates } from "../src/lib/openField.js";
import { resolveRowChain } from "../src/lib/resolveRowChain.js";
import { blocksMap, documentFields, getBlockType } from "./fixtures.js";

describe("rowPathCandidates", () => {
  it("lists the rows that may contain a field, deepest first", () => {
    expect(rowPathCandidates("sections.2.items.0.points.0.text")).toEqual([
      "sections.2.items.0.points.0",
      "sections.2.items.0",
      "sections.2",
    ]);
  });

  it("includes a path that is itself a row, and nothing for top-level fields", () => {
    expect(rowPathCandidates("layout.0")).toEqual(["layout.0"]);
    expect(rowPathCandidates("title")).toEqual([]);
    expect(rowPathCandidates("meta.title")).toEqual([]);
  });

  it("goes through named groups and tabs between rows", () => {
    expect(rowPathCandidates("layout.0.meta.links.3.url")).toEqual([
      "layout.0.meta.links.3",
      "layout.0",
    ]);
  });

  it("yields the panel chain once resolved against the schema", () => {
    const path = "layout.0.items.2.callouts.0.title";
    const [deepest] = rowPathCandidates(path);
    const chain = resolveRowChain({
      blocksMap,
      fields: documentFields,
      getBlockType,
      permissions: true,
      rowPath: deepest ?? "",
    });
    expect(chain.complete).toBe(true);
    expect(chain.levels.map((level) => level.rowPath)).toEqual([
      "layout.0",
      "layout.0.items.2",
      "layout.0.items.2.callouts.0",
    ]);
  });
});

describe("isForDocument", () => {
  const doc = { collectionSlug: "pages", id: 1 };

  it("matches the open collection document", () => {
    expect(isForDocument({ path: "title", collectionSlug: "pages", docId: "1" }, doc)).toBe(true);
    expect(isForDocument({ path: "title", collectionSlug: "pages" }, doc)).toBe(true);
  });

  it("ignores other documents, other collections, globals and empty paths", () => {
    expect(isForDocument({ path: "title", collectionSlug: "pages", docId: "2" }, doc)).toBe(false);
    expect(isForDocument({ path: "title", collectionSlug: "posts", docId: "1" }, doc)).toBe(false);
    expect(isForDocument({ path: "title", globalSlug: "header" }, doc)).toBe(false);
    expect(isForDocument({ path: "", collectionSlug: "pages" }, doc)).toBe(false);
    expect(isForDocument(null, doc)).toBe(false);
  });

  it("matches the open global", () => {
    expect(
      isForDocument({ path: "nav.0.label", globalSlug: "header" }, { globalSlug: "header" })
    ).toBe(true);
  });
});
