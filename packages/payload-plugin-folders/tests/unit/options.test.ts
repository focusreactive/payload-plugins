import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { createFolderField } from "payload";
import type { CollectionConfig, Config } from "payload";
import { describe, expect, it } from "vitest";

import {
  FoldersConfigError,
  normalizeOptions,
  stripUniqueFromSegmentFields,
} from "../../src/options.js";
import { foldersPlugin } from "../../src/plugin.js";
import type { FoldersPluginOptions } from "../../src/types.js";

const buildCollection = (overrides: Record<string, unknown> & { slug: string }): CollectionConfig =>
  ({
    fields: [
      { name: "title", type: "text" },
      { name: "slug", type: "text" },
    ],
    ...overrides,
  }) as CollectionConfig;

const buildConfig = (overrides: Partial<Config> = {}): Config =>
  ({
    collections: [buildCollection({ slug: "pages" }), buildCollection({ slug: "posts" })],
    db: sqliteAdapter({ client: { url: "file::memory:" }, transactionOptions: {} }),
    secret: "unit-test",
    ...overrides,
  }) as Config;

const buildOptions = (overrides: Partial<FoldersPluginOptions> = {}): FoldersPluginOptions =>
  ({ collections: { pages: true }, ...overrides }) as FoldersPluginOptions;

const configErrorProblems = (run: () => unknown): string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof FoldersConfigError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error("Expected a FoldersConfigError, but nothing was thrown");
};

describe("normalizeOptions", () => {
  it("applies every default", () => {
    const resolved = normalizeOptions(buildOptions(), buildConfig());

    expect(resolved).toMatchObject({
      access: { move: undefined, repair: undefined },
      admin: {
        confirmMoves: "urlChange",
        pageSize: 100,
        sidebarTab: { label: "Tree" },
        treeView: true,
      },
      disabled: false,
      enforceAllowedTypesOnMove: true,
      folders: { labels: { plural: "Content", singular: "Folder" }, slug: "folders" },
      limits: { maxFoldersPerMove: 2000, maxItemsPerMove: 500, maxSyncDocuments: 200 },
      localizeSegments: false,
      maxDepth: 20,
      newItemPosition: "top",
      redirects: { enabled: true, mirrorToRedirectsPlugin: false },
      urls: { localePrefix: "non-default" },
      warnings: [],
    });
    expect(resolved.collections.pages).toMatchObject({
      label: "Page",
      segmentField: "slug",
      segmentFieldExists: true,
      titleField: "title",
    });
  });

  it("applies the defaults that depend on the config and the options", () => {
    const localized = normalizeOptions(
      buildOptions({ admin: { pageSize: 5000, sidebarTab: false } }),
      buildConfig({ localization: { defaultLocale: "en", locales: ["en", "de"] } })
    );

    expect(localized.localizeSegments).toBe(true);
    expect(localized.admin.pageSize).toBe(1000);
    expect(localized.admin.sidebarTab).toBe(false);
    expect(
      normalizeOptions(
        buildOptions({ localizeSegments: false }),
        buildConfig({ localization: { defaultLocale: "en", locales: ["en", "de"] } })
      ).localizeSegments
    ).toBe(false);
  });

  it("derives reserved segments from config.routes", () => {
    const defaults = normalizeOptions(buildOptions(), buildConfig()).reservedRootSegments;
    expect(defaults).toEqual(
      expect.arrayContaining(["admin", "api", "graphql", "graphql-playground", "_next"])
    );

    const custom = normalizeOptions(
      buildOptions({ reservedRootSegments: ["Shop", "/checkout/"] }),
      buildConfig({ routes: { admin: "/cms/panel", api: "/rest" } })
    ).reservedRootSegments;
    expect(custom).toEqual(
      expect.arrayContaining([
        "cms",
        "rest",
        "graphql",
        "graphql-playground",
        "_next",
        "shop",
        "checkout",
      ])
    );
    expect(custom).not.toContain("admin");
    expect(custom).not.toContain("api");
  });

  it("errors on an unknown collection slug", () => {
    const problems = configErrorProblems(() =>
      normalizeOptions(buildOptions({ collections: { articles: true } as never }), buildConfig())
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("collections.articles");
  });

  it("errors on a folders slug collision", () => {
    const problems = configErrorProblems(() =>
      normalizeOptions(buildOptions({ folders: { slug: "posts" } }), buildConfig())
    );

    expect(problems.join("\n")).toContain('folders.slug "posts"');
  });

  it("errors on a reserved field name", () => {
    const config = buildConfig({
      collections: [
        buildCollection({
          fields: [
            { name: "title", type: "text" },
            { fields: [{ name: "orderKey", type: "number" }], type: "row" },
            { name: "fullPath", type: "text" },
          ],
          slug: "pages",
        }),
      ],
    });

    const problems = configErrorProblems(() => normalizeOptions(buildOptions(), config));

    expect(problems.join("\n")).toContain('"orderKey"');
    expect(problems.join("\n")).toContain('"fullPath"');
  });

  it("errors on a core folder field", () => {
    const config = buildConfig({
      collections: [
        buildCollection({
          fields: [
            { name: "title", type: "text" },
            createFolderField({ relationTo: "assets" as never }),
          ],
          slug: "pages",
        }),
        buildCollection({ fields: [], folders: true, slug: "assets" }),
      ],
    });

    const problems = configErrorProblems(() => normalizeOptions(buildOptions(), config));

    expect(problems.join("\n")).toContain("_h_assets");
  });

  it("errors on the MongoDB adapter", () => {
    const mongoAdapter = { defaultIDType: "text", init: () => ({}), name: "mongoose" };

    const problems = configErrorProblems(() =>
      normalizeOptions(buildOptions(), buildConfig({ db: mongoAdapter as never }))
    );

    expect(problems.join("\n")).toContain("MongoDB");
  });

  it("errors when the mirror is on without plugin-redirects", () => {
    const options = buildOptions({ redirects: { mirrorToRedirectsPlugin: true } });

    const problems = configErrorProblems(() => normalizeOptions(options, buildConfig()));
    expect(problems.join("\n")).toContain("@payloadcms/plugin-redirects");

    const withPlugin = buildConfig({ plugins: [redirectsPlugin({ collections: [] as never })] });
    expect(normalizeOptions(options, withPlugin).redirects.mirrorToRedirectsPlugin).toBe(true);
  });

  it("warns and strips unique on the host slug field", () => {
    const config = buildConfig({
      collections: [
        buildCollection({
          fields: [
            { name: "title", type: "text" },
            { name: "slug", type: "text", unique: true },
          ],
          slug: "pages",
        }),
      ],
    });

    const resolved = normalizeOptions(buildOptions(), config);
    const [stripped] = stripUniqueFromSegmentFields(
      config.collections as CollectionConfig[],
      resolved
    );

    expect(resolved.warnings).toHaveLength(1);
    expect(resolved.warnings[0]).toContain("unique");
    // Only `unique` goes; the index stays (spec section 2.4).
    expect(stripped.fields).toContainEqual({ name: "slug", type: "text", index: true });
    expect(config.collections?.[0].fields).toContainEqual({
      name: "slug",
      type: "text",
      unique: true,
    });
  });

  it("warns on SQLite without transactionOptions", async () => {
    const warnings: string[] = [];
    const runOnInit = async (adapterArgs: Parameters<typeof sqliteAdapter>[0]) => {
      const db = sqliteAdapter(adapterArgs);
      const result = (await foldersPlugin(buildOptions() as never)(buildConfig({ db }))) as Config;
      const stubLogger = { warn: (message: string) => warnings.push(message) };
      // The live adapter exists only once Payload is up, so the check runs in onInit.
      const liveAdapter = db.init({ payload: { logger: stubLogger } as never });
      // The tree-state row already exists, so onInit's seeding step has nothing to write.
      liveAdapter.findGlobal = (() => Promise.resolve({ id: 1 })) as never;
      await result.onInit?.({ db: liveAdapter, logger: stubLogger } as never);
    };

    await runOnInit({ client: { url: "file::memory:" } });
    expect(warnings.join("\n")).toContain("transactionOptions");

    warnings.length = 0;
    await runOnInit({ client: { url: "file::memory:" }, transactionOptions: {} });
    expect(warnings).toEqual([]);

    expect(normalizeOptions(buildOptions(), buildConfig()).warnings).toEqual([]);
  });

  it("disabled returns the schema only", () => {
    const hostCollections = [
      buildCollection({ slug: "pages" }),
      buildCollection({ slug: "posts" }),
    ];
    const config = buildConfig({ collections: hostCollections });
    const result = foldersPlugin(buildOptions({ disabled: true }) as never)(config) as Config;

    const slugs = result.collections?.map((collection) => collection.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["folders", "folder-redirects", "folder-operations"])
    );
    expect(result.globals?.map((global) => global.slug)).toContain("folders-tree-state");
    const pages = result.collections?.find((collection) => collection.slug === "pages");
    expect(pages?.fields.map((field) => ("name" in field ? field.name : undefined))).toEqual(
      expect.arrayContaining([
        "folder",
        "orderKey",
        "structureRevision",
        "isFolderRoot",
        "pathSegment",
        "folderPath",
        "fullPath",
      ])
    );

    // No runtime behaviour: no endpoints, no hooks and no admin components from the plugin.
    expect(result.endpoints ?? []).toEqual([]);
    expect(result.admin?.components).toBeUndefined();
    for (const collection of result.collections ?? []) {
      expect(collection.endpoints ?? []).toEqual([]);
      expect(collection.admin?.components).toBeUndefined();
      expect(Object.values(collection.hooks ?? {}).flat()).toEqual([]);
      const fieldHooks = collection.fields.flatMap((field) =>
        "hooks" in field && field.hooks ? Object.entries(field.hooks) : []
      );
      // fullPath answers null while the plugin is disabled and is the only field hook the schema carries.
      expect(fieldHooks.map(([hookName]) => hookName)).toEqual(
        collection.slug === "pages" ? ["afterRead"] : []
      );
    }
    expect(result.hooks ?? {}).toEqual(config.hooks ?? {});
    expect(result.globals?.flatMap((global) => global.hooks ?? [])).toEqual([]);

    // The schema stays, so the checks that protect it still run.
    expect(
      configErrorProblems(() =>
        normalizeOptions(
          buildOptions({ collections: { articles: true } as never, disabled: true }),
          buildConfig()
        )
      )
    ).toHaveLength(1);
  });

  it("turns the folders trash on only when every opted-in collection has it", () => {
    const withTrash = (slug: string) => buildCollection({ slug, trash: true });
    const both = buildConfig({ collections: [withTrash("pages"), withTrash("posts")] });
    const mixed = buildConfig({
      collections: [withTrash("pages"), buildCollection({ slug: "posts" })],
    });
    const twoCollections = buildOptions({ collections: { pages: true, posts: true } as never });

    expect(normalizeOptions(twoCollections, both).folders.trash).toBe(true);
    expect(normalizeOptions(twoCollections, mixed).folders.trash).toBe(false);
    expect(normalizeOptions(buildOptions(), buildConfig()).folders.trash).toBe(false);
  });

  it("does not reserve routes.graphQL segments, only the fixed graphql names", () => {
    const reserved = normalizeOptions(
      buildOptions(),
      buildConfig({ routes: { graphQL: "/query", graphQLPlayground: "/play" } })
    ).reservedRootSegments;

    expect(reserved).not.toContain("query");
    expect(reserved).not.toContain("play");
    expect(reserved).toEqual(expect.arrayContaining(["graphql", "graphql-playground"]));
  });

  it("errors on a core folder field that points at a hierarchy collection", () => {
    const config = buildConfig({
      collections: [
        buildCollection({
          fields: [
            { name: "title", type: "text" },
            createFolderField({ relationTo: "tree" as never }),
          ],
          slug: "pages",
        }),
        buildCollection({ fields: [], hierarchy: true, slug: "tree" }),
      ],
    });

    expect(
      configErrorProblems(() => normalizeOptions(buildOptions(), config)).join("\n")
    ).toContain("_h_tree");
  });

  it("looks inside unnamed groups for the segment field, reserved names and unique", () => {
    const grouped = (innerFields: Record<string, unknown>[]) =>
      buildConfig({
        collections: [
          buildCollection({
            fields: [{ fields: innerFields, type: "group" }],
            slug: "pages",
          }),
        ],
      });

    const reservedProblems = configErrorProblems(() =>
      normalizeOptions(buildOptions(), grouped([{ name: "folder", type: "text" }]))
    );
    expect(reservedProblems.join("\n")).toContain('"folder"');

    const config = grouped([{ name: "slug", type: "text", unique: true }]);
    const resolved = normalizeOptions(buildOptions(), config);
    expect(resolved.collections.pages.segmentFieldExists).toBe(true);
    const [stripped] = stripUniqueFromSegmentFields(
      config.collections as CollectionConfig[],
      resolved
    );
    expect(stripped.fields[0]).toMatchObject({
      fields: [{ index: true, name: "slug", type: "text" }],
      type: "group",
    });
  });
});
