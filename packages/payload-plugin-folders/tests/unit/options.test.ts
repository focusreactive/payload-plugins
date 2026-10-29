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
    expect(stripped.fields).toContainEqual({ name: "slug", type: "text" });
    expect(config.collections?.[0].fields).toContainEqual({
      name: "slug",
      type: "text",
      unique: true,
    });
  });

  it("warns on SQLite without transactionOptions", () => {
    const withoutTransactions = buildConfig({
      db: sqliteAdapter({ client: { url: "file::memory:" } }),
    });

    const resolved = normalizeOptions(buildOptions(), withoutTransactions);
    expect(resolved.warnings.join("\n")).toContain("transactionOptions");

    expect(normalizeOptions(buildOptions(), buildConfig()).warnings).toEqual([]);
  });

  it("disabled returns the schema only", () => {
    const disabled = normalizeOptions(buildOptions({ disabled: true }), buildConfig());

    expect(disabled.disabled).toBe(true);
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
});
