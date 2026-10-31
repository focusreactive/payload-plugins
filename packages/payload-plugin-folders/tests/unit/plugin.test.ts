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
      "folderUrlHistory",
      "folderDraftWarning",
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
      confirmMoves: "urlChange",
      enforceAllowedTypesOnMove: true,
      foldersSlug: "folders",
      hasPreviewUrl: false,
      maxDepth: 20,
      pageFields: { pages: { segmentField: "slug", titleField: "title" } },
      pageSize: 50,
      reservedRootSegments: expect.arrayContaining(["admin", "api"]),
      typeLabels: { pages: { explicit: true, label: "Landing page" } },
    });
  });

  it("tells the tree view whether the host set a preview link, without the function itself", async () => {
    const result = await foldersPlugin({
      admin: { previewUrl: ({ fullPath }) => `https://preview.example.test${fullPath}` },
      collections: { pages: true } as never,
    })(buildHostConfig());

    const folders = result.collections?.find((collection) => collection.slug === "folders");

    expect(folders?.custom?.[pluginSlug]).toMatchObject({ hasPreviewUrl: true });
  });

  it("hands the tree view the slug of the folders collection, whatever the host named it", async () => {
    const result = await foldersPlugin({
      collections: { pages: true } as never,
      folders: { slug: "sections" },
    })(buildHostConfig());

    const folders = result.collections?.find((collection) => collection.slug === "sections");

    expect(folders?.custom?.[pluginSlug]).toMatchObject({ foldersSlug: "sections" });
  });

  it("hands the tree view the move settings it needs to ask before a move and to grey out folders", async () => {
    const result = await foldersPlugin({
      admin: { confirmMoves: "always" },
      collections: { pages: true } as never,
      enforceAllowedTypesOnMove: false,
    })(buildHostConfig());

    const folders = result.collections?.find((collection) => collection.slug === "folders");

    expect(folders?.custom?.[pluginSlug]).toMatchObject({
      confirmMoves: "always",
      enforceAllowedTypesOnMove: false,
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

  it("gives every supported admin language the plugin's strings, in English where it has none", async () => {
    const config = buildHostConfig();
    config.i18n = {
      supportedLanguages: { de: {}, en: {}, fr: {} },
      translations: {
        fr: { custom: { greeting: "Bonjour" }, foldersTree: { noPage: "sans page" } },
      },
    } as never;

    const result = await foldersPlugin({ collections: { pages: true } as never })(config);

    const translations = result.i18n?.translations as unknown as Record<
      string,
      Record<string, Record<string, string>>
    >;
    expect(translations.fr?.foldersTree?.loadError).toBe("Could not load this folder");
    // What the host set for fr wins, and its other namespaces stay.
    expect(translations.fr?.foldersTree?.noPage).toBe("sans page");
    expect(translations.fr?.custom).toEqual({ greeting: "Bonjour" });
    expect(translations.de?.foldersTree?.loadError).toBe(
      "Dieser Ordner konnte nicht geladen werden"
    );
  });

  it("puts the edit view's sidebar fields on a page collection in the order of spec section 7.11", async () => {
    const result = await foldersPlugin({
      admin: { previewUrl: ({ fullPath }) => `https://preview.example.test${fullPath}` },
      collections: { pages: true } as never,
    })(buildHostConfig());
    const pages = result.collections?.find((collection) => collection.slug === "pages");
    const componentOf = (name: string) =>
      (
        pages?.fields.find((field) => "name" in field && field.name === name) as {
          admin?: { components?: { Field?: unknown }; position?: string };
        }
      )?.admin;

    // Location, folder root page, full URL, URL history, draft conflict warning: all in the sidebar.
    expect(componentOf("folder")?.components?.Field).toEqual({
      path: `${pluginSlug}/rsc#FolderLocationField`,
      serverProps: { foldersSlug: "folders", segmentField: "slug", titleField: "title" },
    });
    expect(componentOf("isFolderRoot")?.components?.Field).toEqual({
      clientProps: { segmentField: "slug", titleField: "title" },
      path: `${pluginSlug}/client#FolderRootField`,
    });
    expect(componentOf("fullPath")?.components?.Field).toEqual({
      clientProps: { hasPreviewUrl: true, segmentField: "slug" },
      path: `${pluginSlug}/client#FullPathField`,
    });
    expect(componentOf("folderUrlHistory")?.components?.Field).toBe(
      `${pluginSlug}/client#UrlHistoryField`
    );
    expect(componentOf("folderDraftWarning")?.components?.Field).toEqual({
      clientProps: { segmentField: "slug" },
      path: `${pluginSlug}/client#DraftConflictField`,
    });
    for (const name of [
      "folder",
      "isFolderRoot",
      "fullPath",
      "folderUrlHistory",
      "folderDraftWarning",
    ]) {
      expect(componentOf(name)?.position).toBe("sidebar");
    }
  });

  it("replaces the folders edit view's Save button and greys the locked type fields", async () => {
    const result = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig()
    );
    const folders = result.collections?.find((collection) => collection.slug === "folders");
    const fieldComponent = (name: string) =>
      (
        folders?.fields.find((field) => "name" in field && field.name === name) as {
          admin?: { components?: { Field?: string } };
        }
      )?.admin?.components?.Field;

    expect(folders?.admin?.components?.edit?.SaveButton).toBe(
      `${pluginSlug}/client#FolderSaveButton`
    );
    expect(folders?.admin?.components?.edit?.beforeDocumentControls).toEqual([
      `${pluginSlug}/client#FolderTitleFallback`,
    ]);
    expect(fieldComponent("allowedTypes")).toBe(`${pluginSlug}/client#LockableSelectField`);
    expect(fieldComponent("defaultType")).toBe(`${pluginSlug}/client#LockableSelectField`);
    expect(fieldComponent("lockSubfolderTypes")).toBe(`${pluginSlug}/client#LockableCheckboxField`);
  });

  it("leaves the stock edit view alone when the plugin is disabled", async () => {
    const result = await foldersPlugin({ collections: { pages: true } as never, disabled: true })(
      buildHostConfig()
    );
    const pages = result.collections?.find((collection) => collection.slug === "pages");
    const folders = result.collections?.find((collection) => collection.slug === "folders");
    const folderField = pages?.fields.find(
      (field) => "name" in field && field.name === "folder"
    ) as {
      admin?: { components?: unknown };
    };

    expect(folderField.admin?.components).toBeUndefined();
    expect(folders?.admin?.components).toBeUndefined();
  });
});
