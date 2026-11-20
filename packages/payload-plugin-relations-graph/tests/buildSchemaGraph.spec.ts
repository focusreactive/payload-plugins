import type { Block, Field } from "payload";
import { describe, expect, it } from "vitest";

import { buildSchemaGraph } from "../src/graph/buildSchemaGraph.js";
import type { GraphSourceConfig, GraphSourceEntity } from "../src/graph/buildSchemaGraph.js";
import type { GraphEdge } from "../src/graph/types.js";

const collection = (slug: string, fields: Field[], extra: Partial<GraphSourceEntity> = {}) => ({
  fields,
  slug,
  ...extra,
});

const edgeAt = (edges: GraphEdge[], source: string, path: string): GraphEdge => {
  const edge = edges.find((candidate) => candidate.source === source && candidate.path === path);
  if (!edge) {
    throw new Error(`no edge ${source} ${path}; have ${edges.map((e) => e.id).join(", ")}`);
  }
  return edge;
};

const hero: Block = {
  fields: [
    { name: "title", type: "text" },
    { name: "image", relationTo: "media", type: "upload" },
  ],
  slug: "hero",
};

const config: GraphSourceConfig = {
  blocks: [
    {
      fields: [{ hasMany: true, name: "items", relationTo: "articles", type: "relationship" }],
      slug: "shared",
    },
  ],
  collections: [
    collection(
      "articles",
      [
        { name: "title", type: "text" },
        { hasMany: true, name: "authors", relationTo: "authors", type: "relationship" },
        { name: "cover", relationTo: "media", type: "upload" },
        {
          hasMany: true,
          name: "related",
          relationTo: ["articles", "pages"],
          type: "relationship",
        },
        {
          fields: [
            { name: "label", type: "text" },
            {
              fields: [{ name: "category", relationTo: "categories", type: "relationship" }],
              localized: true,
              name: "inner",
              type: "group",
            },
          ],
          name: "meta",
          type: "group",
        },
        {
          fields: [
            {
              fields: [{ name: "author", relationTo: "authors", type: "relationship" }],
              type: "collapsible",
              label: "Body",
            },
          ],
          name: "credits",
          type: "array",
        },
        {
          tabs: [
            {
              fields: [{ name: "ogImage", relationTo: "media", type: "upload" }],
              label: "SEO",
              name: "seo",
            },
            {
              fields: [
                {
                  fields: [{ name: "sponsor", relationTo: "authors", type: "relationship" }],
                  type: "row",
                },
              ],
              label: "Unnamed",
            },
          ],
          type: "tabs",
        },
      ],
      { admin: { useAsTitle: "title" } as never, labels: { plural: "Posts", singular: "Post" } }
    ),
    collection("authors", [
      { name: "name", type: "text" },
      { collection: "articles", name: "posts", on: "authors", type: "join" },
    ]),
    collection("categories", [
      { name: "parent", relationTo: "categories", required: true, type: "relationship" },
    ]),
    collection("media", [{ name: "alt", type: "text" }], { upload: true }),
    collection(
      "pages",
      [
        {
          blockReferences: ["shared"],
          blocks: [
            hero,
            {
              fields: [
                {
                  blocks: [
                    {
                      fields: [{ name: "link", relationTo: "pages", type: "relationship" }],
                      slug: "leaf",
                    },
                  ],
                  name: "children",
                  type: "blocks",
                },
              ],
              slug: "nest",
            },
          ],
          localized: true,
          name: "layout",
          type: "blocks",
        },
      ],
      { versions: { drafts: true } }
    ),
    collection("internal", [{ name: "doc", relationTo: "articles", type: "relationship" }], {
      admin: { hidden: true },
    }),
    collection("audit", [{ name: "page", relationTo: "pages", type: "relationship" }]),
  ],
  globals: [
    {
      fields: [
        { name: "featured", relationTo: "articles", type: "relationship" },
        {
          fields: [{ name: "link", relationTo: ["pages", "articles"], type: "relationship" }],
          name: "nav",
          type: "array",
        },
      ],
      label: "Site header",
      slug: "header",
    },
  ],
};

describe("buildSchemaGraph", () => {
  const { edges, nodes } = buildSchemaGraph(config);

  it("creates one node per visible collection and global", () => {
    expect(nodes.map((node) => node.id)).toEqual([
      "collection:articles",
      "collection:authors",
      "collection:categories",
      "collection:media",
      "collection:pages",
      "collection:audit",
      "global:header",
    ]);
    const articles = nodes.find((node) => node.slug === "articles");
    expect(articles).toMatchObject({ kind: "collection", label: "Posts", upload: false });
    expect(nodes.find((node) => node.slug === "media")).toMatchObject({ upload: true });
    expect(nodes.find((node) => node.slug === "pages")).toMatchObject({ versions: true });
    expect(nodes.find((node) => node.slug === "header")).toMatchObject({
      kind: "global",
      label: "Site header",
    });
  });

  it("humanizes slugs when there is no label", () => {
    expect(nodes.find((node) => node.slug === "audit")?.label).toBe("Audit");
  });

  it("records plain, hasMany and upload relations", () => {
    expect(edgeAt(edges, "collection:articles", "authors")).toMatchObject({
      hasMany: true,
      polymorphic: false,
      queryPath: "authors",
      target: "collection:authors",
      type: "relationship",
    });
    expect(edgeAt(edges, "collection:articles", "cover")).toMatchObject({
      hasMany: false,
      target: "collection:media",
      type: "upload",
    });
  });

  it("creates one edge per target of a polymorphic relation", () => {
    const related = edges.filter((edge) => edge.path === "related");
    expect(related.map((edge) => edge.target)).toEqual(["collection:articles", "collection:pages"]);
    expect(related.every((edge) => edge.polymorphic && edge.hasMany)).toBe(true);
  });

  it("records self-references", () => {
    expect(edgeAt(edges, "collection:categories", "parent")).toMatchObject({
      required: true,
      source: "collection:categories",
      target: "collection:categories",
    });
  });

  it("descends into groups and inherits localized from containers", () => {
    expect(edgeAt(edges, "collection:articles", "meta.inner.category")).toMatchObject({
      localized: true,
      queryPath: "meta.inner.category",
    });
  });

  it("adds array names to the path and skips presentational containers", () => {
    expect(edgeAt(edges, "collection:articles", "credits.author").queryPath).toBe("credits.author");
  });

  it("adds named tabs to the path and skips unnamed tabs and rows", () => {
    expect(edgeAt(edges, "collection:articles", "seo.ogImage").queryPath).toBe("seo.ogImage");
    expect(edgeAt(edges, "collection:articles", "sponsor").queryPath).toBe("sponsor");
  });

  it("puts block slugs in the display path but not in the query path", () => {
    expect(edgeAt(edges, "collection:pages", "layout[hero].image")).toMatchObject({
      blocks: ["hero"],
      localized: true,
      queryPath: "layout.image",
      target: "collection:media",
    });
  });

  it("follows nested blocks", () => {
    expect(edgeAt(edges, "collection:pages", "layout[nest].children[leaf].link")).toMatchObject({
      blocks: ["nest", "leaf"],
      queryPath: "layout.children.link",
      target: "collection:pages",
    });
  });

  it("resolves blockReferences against config.blocks", () => {
    expect(edgeAt(edges, "collection:pages", "layout[shared].items")).toMatchObject({
      blocks: ["shared"],
      hasMany: true,
      queryPath: "layout.items",
      target: "collection:articles",
    });
  });

  it("records join fields with their `on` field", () => {
    expect(edgeAt(edges, "collection:authors", "posts")).toMatchObject({
      hasMany: true,
      on: "authors",
      target: "collection:articles",
      type: "join",
    });
  });

  it("records relations declared in globals", () => {
    expect(edgeAt(edges, "global:header", "featured").target).toBe("collection:articles");
    expect(
      edges.filter((edge) => edge.source === "global:header" && edge.path === "nav.link")
    ).toHaveLength(2);
  });

  it("gives every edge a unique id", () => {
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length);
  });

  it("counts named data fields through containers and blocks", () => {
    // title, authors, cover, related, meta, label, inner, category, credits, author, ogImage,
    // sponsor — named tabs are containers, not counted as fields.
    expect(nodes.find((node) => node.slug === "articles")?.fieldCount).toBe(12);
  });

  it("does not loop on a block nested in itself", () => {
    const recursive: Block = {
      fields: [{ name: "page", relationTo: "pages", type: "relationship" }],
      slug: "recursive",
    };
    recursive.fields.push({ blocks: [recursive], name: "children", type: "blocks" });
    const graph = buildSchemaGraph({
      collections: [collection("pages", [{ blocks: [recursive], name: "layout", type: "blocks" }])],
    });
    expect(graph.edges.map((edge) => edge.path)).toEqual(["layout[recursive].page"]);
  });

  describe("options", () => {
    it("includes hidden collections on request", () => {
      const graph = buildSchemaGraph(config, { includeHidden: true });
      expect(graph.nodes.some((node) => node.slug === "internal")).toBe(true);
      expect(graph.edges.some((edge) => edge.source === "collection:internal")).toBe(true);
    });

    it("drops excluded collections and every edge pointing at them", () => {
      const graph = buildSchemaGraph(config, { exclude: ["media", "header"] });
      expect(graph.nodes.some((node) => node.slug === "media" || node.slug === "header")).toBe(
        false
      );
      expect(graph.edges.some((edge) => edge.target === "collection:media")).toBe(false);
      expect(graph.edges.some((edge) => edge.source === "global:header")).toBe(false);
    });

    it("leaves globals out with includeGlobals: false", () => {
      const graph = buildSchemaGraph(config, { includeGlobals: false });
      expect(graph.nodes.some((node) => node.kind === "global")).toBe(false);
      expect(graph.edges.some((edge) => edge.source.startsWith("global:"))).toBe(false);
    });

    it("keeps only the visible targets of a polymorphic relation", () => {
      const graph = buildSchemaGraph(config, { exclude: ["pages"] });
      expect(
        graph.edges.filter((edge) => edge.path === "related").map((edge) => edge.target)
      ).toEqual(["collection:articles"]);
    });
  });
});

describe("hidden globals", () => {
  const hiddenConfig = {
    collections: [{ fields: [], slug: "posts" }],
    globals: [
      { admin: { hidden: true }, fields: [], slug: "internal" },
      { fields: [], slug: "header" },
    ],
  };

  it("leaves hidden globals out by default", () => {
    const ids = buildSchemaGraph(hiddenConfig).nodes.map((node) => node.id);
    expect(ids).toEqual(["collection:posts", "global:header"]);
  });

  it("includes them with includeHidden", () => {
    const ids = buildSchemaGraph(hiddenConfig, { includeHidden: true }).nodes.map(
      (node) => node.id
    );
    expect(ids).toContain("global:internal");
  });
});
