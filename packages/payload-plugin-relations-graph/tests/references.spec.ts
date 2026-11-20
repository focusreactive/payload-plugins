import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { buildSchemaGraph } from "../src/graph/buildSchemaGraph.js";
import type { GraphSourceConfig } from "../src/graph/buildSchemaGraph.js";
import { findReferences } from "../src/features/references/findReferences.js";
import { referencesEnabledFor } from "../src/features/references/index.js";
import {
  buildReferenceWhere,
  collectValues,
  docReferences,
  isReferenceTo,
  mergeVariants,
  parseFieldPath,
  pickTitle,
  planReferenceLookups,
} from "../src/features/references/query.js";

const config: GraphSourceConfig = {
  collections: [
    {
      fields: [
        { name: "title", type: "text" },
        { name: "category", relationTo: "categories", type: "relationship" },
        { hasMany: true, name: "tags", relationTo: "categories", type: "relationship" },
        {
          hasMany: true,
          name: "related",
          relationTo: ["articles", "categories"],
          type: "relationship",
        },
        {
          fields: [
            {
              fields: [{ name: "primary", relationTo: "categories", type: "relationship" }],
              name: "taxonomy",
              type: "group",
            },
          ],
          name: "meta",
          type: "group",
        },
        {
          fields: [
            { localized: true, name: "category", relationTo: "categories", type: "relationship" },
          ],
          name: "rows",
          type: "array",
        },
        {
          tabs: [
            {
              fields: [{ name: "category", relationTo: "categories", type: "relationship" }],
              label: "SEO",
              name: "seo",
            },
          ],
          type: "tabs",
        },
        {
          blocks: [
            {
              fields: [{ name: "category", relationTo: "categories", type: "relationship" }],
              slug: "teaser",
            },
            {
              fields: [{ name: "category", relationTo: "categories", type: "relationship" }],
              slug: "list",
            },
          ],
          name: "layout",
          type: "blocks",
        },
        { collection: "categories", name: "joined", on: "parent", type: "join" },
      ],
      slug: "articles",
    },
    {
      fields: [{ name: "parent", relationTo: "categories", type: "relationship" }],
      slug: "categories",
    },
  ],
  globals: [
    {
      fields: [{ name: "featured", relationTo: "categories", type: "relationship" }],
      slug: "header",
    },
  ],
};

const graph = buildSchemaGraph(config);
const plan = planReferenceLookups(graph, "categories", 7);
const whereFor = (path: string) => plan.queries.find((lookup) => lookup.edge.path === path)?.where;

describe("buildReferenceWhere", () => {
  it("matches a plain relation by id", () => {
    expect(
      buildReferenceWhere({ polymorphic: false, queryPath: "category" }, "categories", 7)
    ).toEqual({ category: { equals: 7 } });
  });

  it("matches polymorphic relations by collection and id", () => {
    expect(
      buildReferenceWhere({ polymorphic: true, queryPath: "related" }, "categories", "a1")
    ).toEqual({ related: { equals: { relationTo: "categories", value: "a1" } } });
  });
});

describe("planReferenceLookups", () => {
  it("queries top-level, hasMany and polymorphic fields", () => {
    expect(whereFor("category")).toEqual({ category: { equals: 7 } });
    expect(whereFor("tags")).toEqual({ tags: { equals: 7 } });
    expect(whereFor("related")).toEqual({
      related: { equals: { relationTo: "categories", value: 7 } },
    });
  });

  it("queries fields nested in groups, arrays and named tabs by their dot path", () => {
    expect(whereFor("meta.taxonomy.primary")).toEqual({ "meta.taxonomy.primary": { equals: 7 } });
    expect(whereFor("rows.category")).toEqual({ "rows.category": { equals: 7 } });
    expect(whereFor("seo.category")).toEqual({ "seo.category": { equals: 7 } });
  });

  it("includes self-references", () => {
    expect(whereFor("parent")).toEqual({ parent: { equals: 7 } });
  });

  it("scans block fields instead of querying them, one scan per source", () => {
    const scan = plan.scans.find((lookup) => lookup.source.slug === "articles");
    expect(scan?.edges.map((edge) => edge.path)).toEqual([
      "layout[teaser].category",
      "layout[list].category",
    ]);
    expect(plan.queries.some((lookup) => lookup.edge.blocks.length > 0)).toBe(false);
  });

  it("scans globals", () => {
    const scan = plan.scans.find((lookup) => lookup.source.kind === "global");
    expect(scan?.edges.map((edge) => edge.path)).toEqual(["featured"]);
  });

  it("ignores join fields and relations to other collections", () => {
    const paths = [
      ...plan.queries.map((l) => l.edge.path),
      ...plan.scans.flatMap((s) => s.edges.map((e) => e.path)),
    ];
    expect(paths).not.toContain("joined");
    expect(planReferenceLookups(graph, "articles", 1).queries.map((l) => l.edge.path)).toEqual([
      "related",
    ]);
  });
});

describe("parseFieldPath", () => {
  it("splits dot paths and block slugs", () => {
    expect(parseFieldPath("layout[nest].children[leaf].link")).toEqual([
      { block: "nest", name: "layout" },
      { block: "leaf", name: "children" },
      { name: "link" },
    ]);
  });
});

describe("collectValues / docReferences", () => {
  const locales = new Set(["en", "de"]);

  it("reads through arrays, groups and only the matching block type", () => {
    const doc = {
      layout: [
        { blockType: "teaser", category: 1 },
        { blockType: "list", category: 7 },
        { blockType: "teaser", category: 2 },
      ],
    };
    expect(collectValues(doc, parseFieldPath("layout[teaser].category"))).toEqual([1, 2]);
    expect(
      docReferences(doc, { path: "layout[list].category", polymorphic: false }, "categories", 7)
    ).toBe(true);
    expect(
      docReferences(doc, { path: "layout[teaser].category", polymorphic: false }, "categories", 7)
    ).toBe(false);
  });

  it("reads every locale of localized values", () => {
    const doc = { layout: { de: [{ blockType: "teaser", category: 7 }], en: [] } };
    expect(
      docReferences(
        doc,
        { path: "layout[teaser].category", polymorphic: false },
        "categories",
        7,
        locales
      )
    ).toBe(true);
    const leaf = { rows: [{ category: { de: 7, en: 3 } }] };
    expect(collectValues(leaf, parseFieldPath("rows.category"), locales)).toEqual([7, 3]);
  });

  it("reads nested blocks and hasMany values", () => {
    const doc = {
      layout: [{ blockType: "nest", children: [{ blockType: "leaf", links: [1, "7"] }] }],
    };
    expect(
      docReferences(
        doc,
        { path: "layout[nest].children[leaf].links", polymorphic: false },
        "pages",
        7
      )
    ).toBe(true);
  });

  it("matches polymorphic values by collection", () => {
    expect(isReferenceTo({ relationTo: "categories", value: 7 }, "categories", "7", true)).toBe(
      true
    );
    expect(isReferenceTo({ relationTo: "articles", value: 7 }, "categories", 7, true)).toBe(false);
    expect(
      isReferenceTo({ relationTo: "categories", value: { id: 7 } }, "categories", 7, true)
    ).toBe(true);
    expect(isReferenceTo(7, "categories", 7, true)).toBe(false);
  });

  it("matches ids and populated documents", () => {
    expect(isReferenceTo("7", "categories", 7, false)).toBe(true);
    expect(isReferenceTo({ id: 7, title: "x" }, "categories", 7, false)).toBe(true);
    expect(isReferenceTo(null, "categories", 7, false)).toBe(false);
  });
});

describe("pickTitle", () => {
  it("prefers the requested locale of a localized title", () => {
    expect(pickTitle({ de: "Startseite", en: "Home" }, "1", ["de"])).toBe("Startseite");
    expect(pickTitle({ de: "Startseite", en: "" }, "1", ["en"])).toBe("Startseite");
    expect(pickTitle(undefined, "1")).toBe("1");
    expect(pickTitle("", "1")).toBe("1");
  });
});

describe("mergeVariants", () => {
  it("unions ids and flags documents referenced only by their draft", () => {
    const merged = mergeVariants(
      [
        { docs: [{ id: 1, title: "A" }], draft: false, totalDocs: 1 },
        {
          docs: [
            { id: 1, title: "A" },
            { id: 2, title: "B" },
          ],
          draft: true,
          totalDocs: 2,
        },
      ],
      10
    );
    expect(merged).toEqual({
      approximate: false,
      docs: [
        { id: 1, title: "A" },
        { draftOnly: true, id: 2, title: "B" },
      ],
      totalDocs: 2,
    });
  });

  it("falls back to a lower bound when a variant was truncated", () => {
    const merged = mergeVariants(
      [
        { docs: [{ id: 1, title: "A" }], draft: false, totalDocs: 5 },
        { docs: [{ id: 2, title: "B" }], draft: false, totalDocs: 3 },
      ],
      1
    );
    expect(merged).toMatchObject({ approximate: true, totalDocs: 5 });
    expect(merged.docs).toHaveLength(1);
  });
});

describe("referencesEnabledFor", () => {
  it("honours true, a slug list and exclude", () => {
    expect(referencesEnabledFor({ exclude: [], references: true }, "pages")).toBe(true);
    expect(referencesEnabledFor({ exclude: ["pages"], references: true }, "pages")).toBe(false);
    expect(referencesEnabledFor({ exclude: [], references: ["media"] }, "pages")).toBe(false);
    expect(referencesEnabledFor({ exclude: [], references: ["media"] }, "media")).toBe(true);
    expect(referencesEnabledFor({ exclude: [], references: false }, "media")).toBe(false);
  });
});

describe("findReferences", () => {
  const fakePayload = (overrides: { find?: (args: Record<string, unknown>) => unknown } = {}) => {
    const find = vi.fn(
      overrides.find ??
        ((args: Record<string, unknown>) => {
          if (args.collection === "categories") {
            return { docs: [{ id: 3, parent: 7 }], hasNextPage: false, totalDocs: 1 };
          }
          if (args.locale === "all") {
            return {
              docs: [
                { id: 11, layout: [{ blockType: "list", category: 7 }], title: "Scanned" },
                { id: 12, layout: [{ blockType: "teaser", category: 8 }], title: "Other" },
              ],
              hasNextPage: false,
              totalDocs: 2,
            };
          }
          const where = args.where as Record<string, unknown>;
          if ("category" in where) {
            return { docs: [{ id: 1, title: "One" }], hasNextPage: false, totalDocs: 4 };
          }
          if ("tags" in where) {
            throw new Error("boom");
          }
          return { docs: [], hasNextPage: false, totalDocs: 0 };
        })
    );
    const findGlobal = vi.fn(() => ({ featured: 7 }));
    const payload = {
      collections: {
        articles: { config: { admin: { useAsTitle: "title" } } },
        categories: { config: { admin: { useAsTitle: "id" } } },
      },
      config: { ...config, custom: {}, globals: config.globals },
      find,
      findGlobal,
    } as unknown as Payload;
    return { find, findGlobal, payload };
  };

  it("groups results per field and reports a failing field without failing the rest", async () => {
    const { payload } = fakePayload();
    const result = await findReferences({ collection: "categories", id: 7, limit: 5, payload });

    const byPath = Object.fromEntries(result.groups.map((group) => [group.field.path, group]));
    expect(byPath.category).toMatchObject({ docs: [{ id: 1, title: "One" }], totalDocs: 4 });
    expect(byPath.tags).toMatchObject({ docs: [], error: "boom", totalDocs: 0 });
    expect(byPath.parent).toMatchObject({ docs: [{ id: 3, title: "3" }], totalDocs: 1 });
    expect(byPath["layout[list].category"]).toMatchObject({
      docs: [{ id: 11, title: "Scanned" }],
      totalDocs: 1,
    });
    expect(byPath["layout[teaser].category"]).toBeUndefined();
    expect(byPath.featured).toMatchObject({
      docs: [{ id: "header", title: "Header" }],
      source: { kind: "global", slug: "header" },
      totalDocs: 1,
    });
    expect(result.total).toBe(4 + 1 + 1 + 1);
  });

  it("passes the access settings and the limit through", async () => {
    const { find, findGlobal, payload } = fakePayload();
    const req = { locale: "en", payload, user: { id: 1 } } as never;
    await findReferences({ collection: "categories", id: 7, limit: 3, overrideAccess: false, req });
    for (const [args] of find.mock.calls) {
      expect(args).toMatchObject({ depth: 0, overrideAccess: false, req });
    }
    expect(find.mock.calls.some(([args]) => args.limit === 3)).toBe(true);
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }));
  });

  it("leaves out sources the user may not read", async () => {
    const forbidden = Object.assign(new Error("You are not allowed"), { status: 403 });
    const { payload } = fakePayload({
      find: () => {
        throw forbidden;
      },
    });
    const result = await findReferences({ collection: "categories", id: 7, payload });
    expect(result.groups.every((group) => group.source.kind === "global")).toBe(true);
  });
});
