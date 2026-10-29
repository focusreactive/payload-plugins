import type { CollectionConfig, Config } from "payload";
import { describe, expect, it } from "vitest";

import { FoldersConfigError, foldersPlugin, pluginSlug } from "../../src/index.js";

const buildHostConfig = (): Config =>
  ({
    collections: [
      { slug: "pages", fields: [{ name: "title", type: "text" }] },
      { slug: "users", auth: true, fields: [] },
    ],
    secret: "unit",
  }) as unknown as Config;

const listComponent = (config: Config) =>
  config.collections?.find((collection) => collection.slug === "folders")?.admin?.components?.views
    ?.list;

describe("foldersPlugin", () => {
  it("registers under its package slug", () => {
    expect(foldersPlugin({ collections: {} }).slug).toBe(pluginSlug);
  });

  it("adds the plugin's collections and global and the page fields", async () => {
    const config = buildHostConfig();
    const result = await foldersPlugin({ collections: { pages: true } as never })(config);

    expect((result.collections as CollectionConfig[]).map((collection) => collection.slug)).toEqual(
      ["pages", "users", "folders", "folder-redirects", "folder-operations"]
    );
    expect(result.globals?.map((global) => global.slug)).toEqual(["folders-tree-state"]);

    const pages = result.collections?.find((collection) => collection.slug === "pages");
    const fieldNames = pages?.fields.map((field) => ("name" in field ? field.name : undefined));
    expect(fieldNames).toEqual([
      "title",
      "slug",
      "folder",
      "orderKey",
      "structureRevision",
      "isFolderRoot",
      "pathSegment",
      "folderPath",
      "fullPath",
    ]);
    expect(pages?.indexes).toEqual([{ fields: ["folder", "orderKey"] }]);
    // The host's own config object is never modified.
    expect(config.collections).toHaveLength(2);
    expect(config.globals).toBeUndefined();
  });

  it("does not add a second segment field when the host has one", async () => {
    const config = buildHostConfig();
    config.collections = [
      { slug: "pages", fields: [{ name: "slug", type: "text", unique: true }] } as never,
    ];

    const result = await foldersPlugin({ collections: { pages: true } as never })(config);

    const pages = result.collections?.find((collection) => collection.slug === "pages");
    const slugFields = pages?.fields.filter((field) => "name" in field && field.name === "slug");
    // The one field stays the host's, and gains only the duplicate hook (spec section 2.4).
    expect(slugFields).toEqual([
      {
        hooks: { beforeDuplicate: [expect.any(Function)] },
        index: true,
        name: "slug",
        type: "text",
      },
    ]);
  });

  it("throws the config error for an unknown collection", () => {
    expect(() =>
      foldersPlugin({ collections: { missing: true } as never })(buildHostConfig())
    ).toThrow(FoldersConfigError);
  });

  it("puts the tree view on the folders list view unless admin.treeView is false", async () => {
    const withTree = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig()
    );
    const withoutTree = await foldersPlugin({
      admin: { treeView: false },
      collections: { pages: true } as never,
    })(buildHostConfig());

    expect(listComponent(withTree)).toEqual({
      Component: "@focus-reactive/payload-plugin-folders/rsc#TreeViewServer",
    });
    expect(listComponent(withoutTree)).toBeUndefined();
  });

  it("hands the tree view the page size and the type labels as plain values", async () => {
    const result = await foldersPlugin({
      admin: { pageSize: 50 },
      collections: { pages: { label: "Landing page" } } as never,
    })(buildHostConfig());

    const folders = result.collections?.find((collection) => collection.slug === "folders");

    expect(folders?.custom?.[pluginSlug]).toEqual({
      pageSize: 50,
      typeLabels: { pages: "Landing page" },
    });
  });

  it("merges its translations under the host's own, in every language the host sets", async () => {
    const config = buildHostConfig();
    config.i18n = {
      translations: {
        de: { custom: { greeting: "Hallo" }, foldersTree: { noPage: "ohne Seite" } },
      },
    } as never;

    const result = await foldersPlugin({ collections: { pages: true } as never })(config);

    const translations = result.i18n?.translations as unknown as Record<
      string,
      Record<string, Record<string, string>>
    >;
    // The host's strings stay, the plugin's fill in around them.
    expect(translations.de?.custom).toEqual({ greeting: "Hallo" });
    expect(translations.de?.foldersTree?.noPage).toBe("ohne Seite");
    expect(translations.de?.foldersTree?.loadError).toBe(
      "Dieser Ordner konnte nicht geladen werden"
    );
    expect(translations.en?.foldersTree?.noPage).toBe("no page");
  });
});
