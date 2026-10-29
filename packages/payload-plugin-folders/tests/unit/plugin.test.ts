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
});
