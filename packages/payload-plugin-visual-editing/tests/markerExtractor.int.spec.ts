import { beforeEach, describe, expect, it } from "vitest";

import { groupNodesByPath, readMarkerFromAttrs } from "../src/client/overlay/markerExtractor";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../src/constants";

describe("readMarkerFromAttrs", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when path is missing", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "pages");
    expect(readMarkerFromAttrs(el)).toBeNull();
  });

  it("returns null when collectionSlug is missing", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_PATH_ATTR, "body");
    expect(readMarkerFromAttrs(el)).toBeNull();
  });

  it("returns marker with docId when all attrs are present", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_PATH_ATTR, "hero.heading");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "pages");
    el.setAttribute(DATA_VE_KIND_ATTR, "collection");
    el.setAttribute(DATA_VE_DOC_ID_ATTR, "p-42");

    expect(readMarkerFromAttrs(el)).toEqual({
      path: "hero.heading",
      collectionSlug: "pages",
      kind: "collection",
      docId: "p-42",
    });
  });

  it("omits docId when its attr is absent (global document case)", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_PATH_ATTR, "title");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "siteSettings");
    el.setAttribute(DATA_VE_KIND_ATTR, "global");

    const marker = readMarkerFromAttrs(el);
    expect(marker).not.toBeNull();
    expect(marker).not.toHaveProperty("docId");
    expect(marker).toMatchObject({
      path: "title",
      collectionSlug: "siteSettings",
      kind: "global",
    });
  });

  it("defaults kind to 'collection' when the attr is missing", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_PATH_ATTR, "body");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "pages");
    expect(readMarkerFromAttrs(el)).toMatchObject({ kind: "collection" });
  });

  it("accepts an empty data-ve-path when the attribute is present (upload-root marker)", () => {
    const el = document.createElement("img");
    el.setAttribute(DATA_VE_PATH_ATTR, "");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "media");
    el.setAttribute(DATA_VE_KIND_ATTR, "collection");
    el.setAttribute(DATA_VE_DOC_ID_ATTR, "m-1");

    expect(readMarkerFromAttrs(el)).toEqual({
      path: "",
      collectionSlug: "media",
      kind: "collection",
      docId: "m-1",
    });
  });

  it("still returns null when data-ve-path attr is absent entirely", () => {
    const el = document.createElement("div");
    el.setAttribute(DATA_VE_COLLECTION_ATTR, "media");
    el.setAttribute(DATA_VE_KIND_ATTR, "collection");
    el.setAttribute(DATA_VE_DOC_ID_ATTR, "m-1");
    expect(readMarkerFromAttrs(el)).toBeNull();
  });
});

describe("groupNodesByPath", () => {
  const makeMatch = (text: string, path: string) => ({
    textNode: document.createTextNode(text),
    path,
    collectionSlug: "pages" as const,
    kind: "collection" as const,
    docId: "p-1",
  });

  const findByPath = (groups: ReturnType<typeof groupNodesByPath>, path: string) =>
    groups.find((g) => g.ctx.path === path);

  it("groups two text nodes with the same path AND same anchor into a single entry", () => {
    const a = makeMatch("A", "hero.title");
    const b = makeMatch("B", "hero.title");
    const groups = groupNodesByPath([a, b]);

    expect(groups).toHaveLength(1);
    const entry = findByPath(groups, "hero.title");
    expect(entry?.nodes).toHaveLength(2);
    expect(entry?.nodes).toContain(a.textNode);
    expect(entry?.nodes).toContain(b.textNode);
    expect(entry?.ctx).toMatchObject({ path: "hero.title", collectionSlug: "pages" });
  });

  it("keeps different paths as separate entries", () => {
    const a = makeMatch("A", "hero.title");
    const b = makeMatch("B", "hero.subtitle");
    const groups = groupNodesByPath([a, b]);

    expect(groups).toHaveLength(2);
    expect(findByPath(groups, "hero.title")?.nodes).toEqual([a.textNode]);
    expect(findByPath(groups, "hero.subtitle")?.nodes).toEqual([b.textNode]);
  });

  it("deduplicates when the same text node appears twice", () => {
    const m = makeMatch("A", "hero.title");
    const groups = groupNodesByPath([m, m]);
    const entry = findByPath(groups, "hero.title");
    expect(entry?.nodes).toHaveLength(1);
  });

  // Same path rendered twice (e.g. a link label duplicated for mobile + desktop) must
  // produce one target per anchor, not a single LCA spanning both copies.
  it("splits same-path matches across different <a>/<button> ancestors", () => {
    const desktopAnchor = document.createElement("a");
    const mobileAnchor = document.createElement("a");
    const desktopText = document.createTextNode("Visit");
    const mobileText = document.createTextNode("Visit");
    desktopAnchor.append(desktopText);
    mobileAnchor.append(mobileText);
    document.body.append(desktopAnchor, mobileAnchor);

    const groups = groupNodesByPath([
      {
        textNode: desktopText,
        path: "links.0.label",
        collectionSlug: "pages" as const,
        kind: "collection" as const,
        docId: "p-1",
      },
      {
        textNode: mobileText,
        path: "links.0.label",
        collectionSlug: "pages" as const,
        kind: "collection" as const,
        docId: "p-1",
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]!.nodes).toEqual([desktopText]);
    expect(groups[1]!.nodes).toEqual([mobileText]);
  });

  // Three sibling docs of the same collection (e.g. FeatureSet cards) share the relative
  // path 'title'. Grouping by path alone would merge them into one group whose LCA is
  // the wrapper around all three — producing one giant Edit target instead of one per card.
  it("splits same-path matches across different docIds of the same collection", () => {
    const a = document.createTextNode("General admission");
    const b = document.createTextNode("Punchcards");
    const c = document.createTextNode("Memberships");
    const groups = groupNodesByPath([
      {
        textNode: a,
        path: "title",
        collectionSlug: "featureSets" as const,
        kind: "collection" as const,
        docId: "fs-1",
      },
      {
        textNode: b,
        path: "title",
        collectionSlug: "featureSets" as const,
        kind: "collection" as const,
        docId: "fs-2",
      },
      {
        textNode: c,
        path: "title",
        collectionSlug: "featureSets" as const,
        kind: "collection" as const,
        docId: "fs-3",
      },
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.ctx.docId)).toEqual(["fs-1", "fs-2", "fs-3"]);
    expect(groups.map((g) => g.nodes)).toEqual([[a], [b], [c]]);
  });

  // A page can surface the same relative path from two different collections
  // (e.g. the outer Location doc's own `title` alongside a FeatureSet's `title`).
  // Grouping must also key on collectionSlug.
  it("splits same-path matches across different collections", () => {
    const a = document.createTextNode("Location title");
    const b = document.createTextNode("FeatureSet title");
    const groups = groupNodesByPath([
      {
        textNode: a,
        path: "title",
        collectionSlug: "locations" as const,
        kind: "collection" as const,
        docId: "loc-1",
      },
      {
        textNode: b,
        path: "title",
        collectionSlug: "featureSets" as const,
        kind: "collection" as const,
        docId: "fs-1",
      },
    ]);

    expect(groups).toHaveLength(2);
  });
});
