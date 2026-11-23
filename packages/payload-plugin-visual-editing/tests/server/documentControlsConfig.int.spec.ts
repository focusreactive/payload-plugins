import type { Config } from "payload";

import { describe, expect, it } from "vitest";

import { visualEditingPlugin } from "../../src/index";

import { configOf } from "../support/payloadConfig";

const BROADCASTER = {
  clientProps: { excludeFieldNames: ["tenant"] },
  path: "@focus-reactive/payload-plugin-visual-editing/admin#InstantPreviewBroadcaster",
};

const PREVIEW_PAGE_BRIDGE = {
  path: "@focus-reactive/payload-plugin-visual-editing/admin#PreviewPageBridge",
};

const OPEN_FORM_ANNOUNCER = {
  path: "@focus-reactive/payload-plugin-visual-editing/admin#OpenFormAnnouncer",
};

const SCHEMA_CACHE_KEY = "@focus-reactive/payload-plugin-visual-editing/schemaCache";

const livePreview = { url: "http://localhost:3000" };

const baseConfig = configOf({
  admin: { livePreview: { collections: ["post"], globals: ["footer"] } },
  collections: [
    { admin: { livePreview }, fields: [], slug: "page" },
    { fields: [], slug: "post" },
    { fields: [], slug: "category" },
    { admin: { livePreview }, fields: [], slug: "users" },
  ],
  globals: [
    { admin: { livePreview }, fields: [], slug: "nav" },
    { fields: [], slug: "footer" },
    { fields: [], slug: "settings" },
  ],
});

const build = (instantPreview?: boolean) =>
  visualEditingPlugin({
    excludeFieldNames: ["tenant"],
    instantPreview,
    skipCollections: ["users"],
  })(baseConfig) as Config;

const collectionControls = (config: Config, slug: string) =>
  config.collections?.find((collection) => collection.slug === slug)?.admin?.components?.edit
    ?.beforeDocumentControls;

const globalControls = (config: Config, slug: string) =>
  config.globals?.find((global) => global.slug === slug)?.admin?.components?.elements
    ?.beforeDocumentControls;

describe("document controls", () => {
  it("adds the broadcaster where the collection or global configures live preview", () => {
    const config = build(true);

    expect(collectionControls(config, "page")).toEqual([
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
    expect(globalControls(config, "nav")).toEqual([
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
  });

  it("adds the broadcaster where the root config enables live preview", () => {
    const config = build(true);

    expect(collectionControls(config, "post")).toEqual([
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
    expect(globalControls(config, "footer")).toEqual([
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
  });

  it("announces the open form, for click-to-edit by key, where live preview is not configured", () => {
    const config = build(true);

    expect(collectionControls(config, "category")).toEqual([OPEN_FORM_ANNOUNCER]);
    expect(globalControls(config, "settings")).toEqual([OPEN_FORM_ANNOUNCER]);
  });

  it("keeps existing document controls ahead of the broadcaster", () => {
    const withExistingControls = configOf({
      collections: [
        {
          admin: {
            components: { edit: { beforeDocumentControls: ["/existing#Collection"] } },
            livePreview,
          },
          fields: [],
          slug: "page",
        },
      ],
      globals: [
        {
          admin: {
            components: { elements: { beforeDocumentControls: ["/existing#Global"] } },
            livePreview,
          },
          fields: [],
          slug: "nav",
        },
      ],
    });
    const config = visualEditingPlugin({ excludeFieldNames: ["tenant"], instantPreview: true })(
      withExistingControls
    ) as Config;

    expect(collectionControls(config, "page")).toEqual([
      "/existing#Collection",
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
    expect(globalControls(config, "nav")).toEqual([
      "/existing#Global",
      PREVIEW_PAGE_BRIDGE,
      OPEN_FORM_ANNOUNCER,
      BROADCASTER,
    ]);
  });

  it("leaves skipped collections untouched", () => {
    expect(collectionControls(build(true), "users")).toBeUndefined();
  });

  it("announces the preview page and the open form, for a link with a field to focus, when the option is off", () => {
    const config = build();

    expect(collectionControls(config, "page")).toEqual([PREVIEW_PAGE_BRIDGE, OPEN_FORM_ANNOUNCER]);
    expect(collectionControls(config, "post")).toEqual([PREVIEW_PAGE_BRIDGE, OPEN_FORM_ANNOUNCER]);
    expect(globalControls(config, "footer")).toEqual([PREVIEW_PAGE_BRIDGE, OPEN_FORM_ANNOUNCER]);
  });

  it("announces the open form where live preview is not configured and the option is off", () => {
    const config = build();

    expect(collectionControls(config, "category")).toEqual([OPEN_FORM_ANNOUNCER]);
    expect(globalControls(config, "settings")).toEqual([OPEN_FORM_ANNOUNCER]);
  });

  it("keeps the schema cache for readUnsavedRichText in config.custom next to existing keys when the option is on", () => {
    const config = visualEditingPlugin({ instantPreview: true })({
      ...baseConfig,
      custom: { existing: "kept" },
    }) as Config;

    expect(config.custom).toEqual({
      [SCHEMA_CACHE_KEY]: { get: expect.any(Function) },
      existing: "kept",
    });
  });

  it("leaves config.custom as it was when the option is off", () => {
    const custom = { existing: "kept" };
    const config = visualEditingPlugin()({ ...baseConfig, custom }) as Config;

    expect(config.custom).toBe(custom);
    expect(build().custom).toBeUndefined();
  });
});
