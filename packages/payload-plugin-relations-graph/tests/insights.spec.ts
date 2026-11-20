import type { Block, Field } from "payload";
import { describe, expect, it } from "vitest";

import { analyzeSchema } from "../src/features/insights/analyzeSchema.js";
import { analyzeStats, isLookupCollection } from "../src/features/insights/analyzeStats.js";
import { fillWhere, parseDisplayPath, relationIds } from "../src/features/insights/fieldValues.js";
import type { RelationsStats } from "../src/features/insights/types.js";
import { buildSchemaGraph } from "../src/graph/buildSchemaGraph.js";
import { toMarkdown } from "../src/graph/toMarkdown.js";
import type { GraphEdge, SchemaGraph } from "../src/graph/types.js";

const col = (slug: string, fields: Field[], extra: Record<string, unknown> = {}) => ({
  fields,
  slug,
  ...extra,
});

const hero: Block = {
  fields: [{ name: "image", relationTo: "media", type: "upload" }],
  slug: "hero",
};
const gallery: Block = {
  fields: [
    { name: "image", relationTo: "media", type: "upload" },
    {
      blocks: [{ fields: [{ name: "image", relationTo: "media", type: "upload" }], slug: "card" }],
      name: "cards",
      type: "blocks",
    },
  ],
  slug: "gallery",
};

const graph = buildSchemaGraph({
  collections: [
    col("users", [{ name: "name", type: "text" }], { auth: true }),
    col("media", [{ name: "alt", type: "text" }], { upload: true }),
    col("files", [{ name: "alt", type: "text" }], { upload: true }),
    col("logs", [{ name: "message", type: "text" }]),
    col("categories", [
      { name: "parent", relationTo: "categories", required: true, type: "relationship" },
    ]),
    col("authors", [
      { name: "avatar", relationTo: "media", type: "upload" },
      { name: "team", relationTo: "teams", required: true, type: "relationship" },
      { collection: "articles", name: "articles", on: "authors", type: "join" },
    ]),
    col("teams", [{ name: "lead", relationTo: "authors", required: true, type: "relationship" }]),
    col("articles", [
      { hasMany: true, name: "authors", relationTo: "authors", type: "relationship" },
      { name: "category", relationTo: "categories", type: "relationship" },
      { name: "cover", relationTo: "media", type: "upload" },
      { name: "_variantOf", relationTo: "articles", type: "relationship" },
      {
        hasMany: true,
        name: "related",
        relationTo: ["articles", "pages", "teams", "authors"],
        type: "relationship",
      },
    ]),
    col("pages", [
      { blocks: [hero, gallery], localized: true, name: "layout", type: "blocks" },
      {
        fields: [{ name: "image", relationTo: "media", type: "upload" }],
        name: "meta",
        type: "group",
      },
    ]),
  ],
  globals: [{ fields: [{ name: "logo", relationTo: "media", type: "upload" }], slug: "header" }],
});

const edge = (id: string): GraphEdge => {
  const found = graph.edges.find((item) => item.id === id);
  if (!found) {
    throw new Error(`no edge ${id}; have ${graph.edges.map((item) => item.id).join(", ")}`);
  }
  return found;
};

describe("analyzeSchema", () => {
  const findings = analyzeSchema(graph);
  const byCheck = (check: string) => findings.filter((finding) => finding.check === check);

  it("is deterministic and lists warnings first", () => {
    expect(analyzeSchema(graph)).toEqual(findings);
    const firstInfo = findings.findIndex((finding) => finding.severity === "info");
    expect(findings.slice(firstInfo).every((finding) => finding.severity === "info")).toBe(true);
  });

  it("finds loops of required relations, including self-references", () => {
    const cycles = byCheck("required-cycle");
    expect(cycles.map((finding) => finding.nodeIds)).toEqual(
      expect.arrayContaining([
        ["collection:categories"],
        ["collection:authors", "collection:teams"],
      ])
    );
    expect(cycles.every((finding) => finding.severity === "warning")).toBe(true);
    const loop = cycles.find((finding) => finding.nodeIds.length === 2);
    expect(loop?.detail).toContain("authors.team");
    expect(loop?.detail).toContain("teams.lead");
  });

  it("ignores optional relations and relations inside blocks when looking for loops", () => {
    const loose = buildSchemaGraph({
      collections: [
        col("a", [{ name: "b", relationTo: "b", type: "relationship" }]),
        col("b", [{ name: "a", relationTo: "a", required: true, type: "relationship" }]),
      ],
    });
    expect(analyzeSchema(loose).filter((finding) => finding.check === "required-cycle")).toEqual(
      []
    );
  });

  it("flags hubs with many incoming fields from several sources", () => {
    const hub = byCheck("hub");
    expect(hub.map((finding) => finding.nodeIds[0])).toEqual(["collection:media"]);
    expect(hub[0]?.title).toContain("7 fields");
  });

  it("flags upload collections nothing points to, and isolated content collections", () => {
    expect(byCheck("unlinked-upload").map((finding) => finding.nodeIds)).toEqual([
      ["collection:files"],
    ]);
    // users (auth) and media/files (uploads) are never "isolated".
    expect(byCheck("isolated").map((finding) => finding.nodeIds)).toEqual([["collection:logs"]]);
  });

  it("suggests joins per target, skipping existing joins, polymorphic and internal fields", () => {
    const joins = byCheck("missing-join");
    const targets = joins.map((finding) => finding.nodeIds[0]).toSorted();
    expect(targets).toEqual(["collection:authors", "collection:categories", "collection:teams"]);
    const authors = joins.find((finding) => finding.nodeIds[0] === "collection:authors");
    // articles.authors already has the `authors.articles` join; only teams.lead is missing.
    expect(authors?.detail).toContain("teams.lead");
    expect(authors?.detail).not.toContain("articles.authors");
    expect(joins.some((finding) => finding.detail.includes("_variantOf"))).toBe(false);
    expect(joins.some((finding) => finding.detail.includes("related"))).toBe(false);
  });

  it("reports block fields sharing a query path", () => {
    const ambiguous = byCheck("ambiguous-query-path");
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0]?.detail).toContain("layout[hero].image");
    expect(ambiguous[0]?.detail).toContain("layout[gallery].image");
    expect(ambiguous[0]?.title).toContain("`layout.image`");
  });

  it("reports relations nested in blocks within blocks", () => {
    expect(byCheck("deep-relation").map((finding) => finding.edgeIds)).toEqual([
      ["collection:pages>layout[gallery].cards[card].image>media"],
    ]);
  });

  it("reports polymorphic fields with many targets", () => {
    const wide = byCheck("wide-polymorphic");
    expect(wide).toHaveLength(1);
    expect(wide[0]?.edgeIds).toHaveLength(4);
  });

  it("returns nothing for a tidy model", () => {
    const tidy = buildSchemaGraph({
      collections: [
        col("posts", [{ name: "tag", relationTo: "tags", type: "relationship" }]),
        col("tags", [{ collection: "posts", name: "posts", on: "tag", type: "join" }]),
      ],
    });
    expect(analyzeSchema(tidy)).toEqual([]);
  });
});

describe("relationIds / parseDisplayPath", () => {
  const locales = new Set(["en", "de"]);

  it("parses block segments", () => {
    expect(parseDisplayPath("layout[gallery].cards[card].image")).toEqual([
      { block: "gallery", name: "layout" },
      { block: "card", name: "cards" },
      { name: "image" },
    ]);
  });

  it("reads single, hasMany and populated values", () => {
    expect(relationIds({ cover: 3 }, edge("collection:articles>cover>media"), "media")).toEqual([
      3,
    ]);
    expect(relationIds({ cover: null }, edge("collection:articles>cover>media"), "media")).toEqual(
      []
    );
    expect(
      relationIds(
        { authors: [1, { id: 2 }] },
        edge("collection:articles>authors>authors"),
        "authors"
      )
    ).toEqual([1, 2]);
  });

  it("keeps only the target collection of polymorphic values", () => {
    const doc = {
      related: [
        { relationTo: "pages", value: 7 },
        { relationTo: "articles", value: 8 },
        { relationTo: "pages", value: { id: 9 } },
      ],
    };
    expect(relationIds(doc, edge("collection:articles>related>pages"), "pages")).toEqual([7, 9]);
    expect(relationIds(doc, edge("collection:articles>related>articles"), "articles")).toEqual([8]);
  });

  it("walks localized blocks by block type, including nested blocks", () => {
    const doc = {
      layout: {
        de: [{ blockType: "hero", image: 3 }],
        en: [
          { blockType: "hero", image: 1 },
          { blockType: "gallery", cards: [{ blockType: "card", image: 5 }], image: 2 },
        ],
      },
    };
    expect(
      relationIds(
        doc,
        edge("collection:pages>layout[hero].image>media"),
        "media",
        locales
      ).toSorted()
    ).toEqual([1, 3]);
    expect(
      relationIds(doc, edge("collection:pages>layout[gallery].image>media"), "media", locales)
    ).toEqual([2]);
    expect(
      relationIds(
        doc,
        edge("collection:pages>layout[gallery].cards[card].image>media"),
        "media",
        locales
      )
    ).toEqual([5]);
  });

  it("reads groups and localized leaf values", () => {
    expect(
      relationIds({ meta: { image: 4 } }, edge("collection:pages>meta.image>media"), "media")
    ).toEqual([4]);
    expect(
      relationIds(
        { cover: { de: 2, en: 1 } },
        edge("collection:articles>cover>media"),
        "media",
        locales
      )
    ).toEqual([2, 1]);
  });
});

describe("fillWhere", () => {
  it("uses exists for top-level relations", () => {
    expect(fillWhere(edge("collection:articles>cover>media"), "media")).toEqual({
      cover: { exists: true },
    });
    expect(fillWhere(edge("collection:articles>authors>authors"), "authors")).toEqual({
      authors: { exists: true },
    });
  });

  it("uses relationTo for polymorphic hasMany relations", () => {
    expect(fillWhere(edge("collection:articles>related>pages"), "pages")).toEqual({
      "related.relationTo": { equals: "pages" },
    });
  });

  it("refuses nested, block, localized and join fields", () => {
    expect(fillWhere(edge("collection:pages>meta.image>media"), "media")).toBeNull();
    expect(fillWhere(edge("collection:pages>layout[hero].image>media"), "media")).toBeNull();
    expect(fillWhere(edge("collection:authors>articles>articles"), "articles")).toBeNull();
  });
});

const stats = (partial: Partial<RelationsStats>): RelationsStats => ({
  caveats: [],
  edges: {},
  generatedAt: "2026-01-01T00:00:00.000Z",
  nodes: {},
  scanLimit: 5000,
  truncated: false,
  ...partial,
});

describe("analyzeStats", () => {
  it("reports unreferenced uploads and lookup documents, never auth or content collections", () => {
    const findings = analyzeStats(
      graph,
      stats({
        nodes: {
          "collection:articles": { total: 10, unreferenced: 9 },
          "collection:categories": { total: 8, unreferenced: 3 },
          "collection:media": { total: 120, unreferenced: 38 },
        },
      })
    );
    const media = findings.find((finding) => finding.check === "unreferenced-uploads");
    expect(media?.title).toBe("38 of 120 media files not referenced by any relation field");
    expect(media?.detail).toContain("rich text are not counted");
    expect(media?.detail).not.toMatch(/safe to delete/u);
    expect(findings.find((finding) => finding.check === "unreferenced-documents")?.nodeIds).toEqual(
      ["collection:categories"]
    );
    expect(findings.some((finding) => finding.nodeIds.includes("collection:articles"))).toBe(false);
  });

  it("skips unreferenced numbers that are null or zero", () => {
    const findings = analyzeStats(
      graph,
      stats({ nodes: { "collection:media": { total: 5, unreferenced: null } } })
    );
    expect(findings).toEqual([]);
  });

  it("warns about required relations left empty", () => {
    const findings = analyzeStats(
      graph,
      stats({
        edges: { "collection:teams>lead>authors": { filled: 3, method: "count", total: 5 } },
      })
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.title).toBe("Required teams.lead is empty in 2 of 5");
  });

  it("reports never and rarely used relations above the sample thresholds", () => {
    const findings = analyzeStats(
      graph,
      stats({
        edges: {
          "collection:articles>_variantOf>articles": { filled: 0, method: "count", total: 40 },
          "collection:articles>category>categories": { filled: 2, method: "count", total: 40 },
          "collection:articles>cover>media": { filled: 0, method: "count", total: 40 },
          "collection:articles>related>pages": { filled: 0, method: "count", total: 2 },
          "collection:pages>meta.image>media": { filled: null, method: null, total: 40 },
        },
      })
    );
    expect(findings.map((finding) => [finding.check, finding.edgeIds[0]])).toEqual([
      ["relation-rare", "collection:articles>category>categories"],
      ["relation-unused", "collection:articles>cover>media"],
    ]);
    expect(findings[0]?.title).toBe("articles.category is set on 2 of 40 (5%)");
  });

  it("knows lookup collections", () => {
    const node = (id: string) => graph.nodes.find((item) => item.id === id);
    const lookup = (id: string) => {
      const found = node(id);
      return found ? isLookupCollection(graph, found) : undefined;
    };
    expect(lookup("collection:categories")).toBe(true);
    expect(lookup("collection:articles")).toBe(false);
    expect(lookup("collection:pages")).toBe(false);
  });
});

describe("toMarkdown", () => {
  const small: SchemaGraph = buildSchemaGraph({
    collections: [
      col("media", [{ name: "alt", type: "text" }], { upload: true }),
      col("posts", [
        { name: "cover", relationTo: "media", required: true, type: "upload" },
        { hasMany: true, name: "links", relationTo: ["posts", "media"], type: "relationship" },
        { blocks: [hero], name: "layout", type: "blocks" },
      ]),
      col("tags", [{ collection: "posts", name: "posts", on: "tag", type: "join" }]),
    ],
    globals: [
      { fields: [{ name: "home", relationTo: "posts", type: "relationship" }], slug: "settings" },
    ],
  });

  it("is deterministic regardless of node and edge order", () => {
    const shuffled: SchemaGraph = {
      edges: small.edges.toReversed(),
      nodes: small.nodes.toReversed(),
    };
    expect(toMarkdown(shuffled)).toBe(toMarkdown(small));
  });

  it("describes entities, relation fields, joins and reverse references", () => {
    expect(toMarkdown(small)).toMatchInlineSnapshot(`
      "# Content model

      Payload CMS: 3 collections, 1 global. Slugs in \`code\`.
      Relation fields: \`path\` → target (cardinality, flags). \`[block]\` in a path means the field sits inside that block type. Stored values are document ids; polymorphic values are \`{ relationTo, value }\`.
      Join fields are virtual, read-only reverse lists computed from another collection's relation field.

      ## Media (\`media\`)
      collection, upload (files), 1 field
      - Referenced by: \`posts.cover\` (one), \`posts.layout[hero].image\` (one), \`posts.links\` (many)

      ## Posts (\`posts\`)
      collection, 4 fields
      - \`cover\` → \`media\` (one, required, upload)
      - \`layout[hero].image\` → \`media\` (one, upload, in block hero) (query as \`layout.image\`)
      - \`links\` → \`media\` | \`posts\` (many, polymorphic: value is \`{ relationTo, value }\`)
      - Referenced by: \`posts.links\` (many), \`settings.home\` (one)

      ## Tags (\`tags\`)
      collection, 1 field
      - \`posts\`: join, lists \`posts\` documents whose \`tag\` points here

      ## Settings (\`settings\`)
      global (single document), 1 field
      - \`home\` → \`posts\` (one)
      "
    `);
  });
});
