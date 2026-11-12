import type { CollectionConfig, GlobalConfig, Plugin } from "payload";

import type { ValueExcludePredicate } from "./excludeValues.js";
import type { Enrichment } from "./server/markedReads.js";

import { PACKAGE_NAME } from "./shared/packageName.js";
import { defaultExcludeValues } from "./excludeValues.js";
import { createReadHooks } from "./server/hooks/readHooks.js";
import {
  createGlobalUnsavedRichTextHook,
  createUnsavedRichTextHook,
} from "./server/unsavedRichText/hooks.js";
import { createSchemaCache, withSchemaCache } from "./server/schemaCache.js";
import { createStripStegaHook } from "./server/hooks/stripStegaHook.js";
import {
  withInstantPreviewCollection,
  withInstantPreviewGlobal,
} from "./server/withInstantPreview.js";

export {
  defaultExcludeValues,
  isHash,
  isIsoDate,
  isSlug,
  isUrl,
  type ValueExcludePredicate,
} from "./excludeValues.js";

export { stripMarkers } from "./stripMarkers.js";

export {
  DEFAULT_MAX_UNSAVED_STATE_LENGTH,
  DEFAULT_UNSAVED_READ_TIME_LIMIT_MS,
  readUnsavedRichText,
  type ReadUnsavedRichTextArgs,
  type UnsavedRichTextDepth,
} from "./readUnsavedRichText.js";
export { isUnsavedRichTextRead } from "./server/unsavedRichText/readContext.js";
export type { LiveRichTextField, LiveRichTextRequest } from "./shared/protocol.js";

declare module "payload" {
  interface RequestContext {
    visualEditing?: boolean;
  }
}

const INTERNAL_COLLECTIONS = [
  "payload-preferences",
  "payload-migrations",
  "payload-locked-documents",
  "payload-jobs",
];

const BRIDGE_COMPONENT_PATH = `${PACKAGE_NAME}/admin#VisualEditingBridgeProvider`;

export type VisualEditingPluginConfig = {
  skipCollections?: string[];
  skipGlobals?: string[];
  excludeFieldNames?: string[];
  /** Value-shape predicates; any matching value is left un-stega'd. Replaces defaults when set.
   *  Omit to use `defaultExcludeValues` (URL / slug / hash / ISO-date). */
  excludeValues?: ValueExcludePredicate[];
  adminBasePath?: string;
  /** `'auto'` (default) enriches any Local API draft read outside the admin.
   *  `'explicit'` enriches only reads that pass `context: { visualEditing: true }`. */
  enrichment?: Enrichment;
  instantPreview?: boolean;
};

export const visualEditingPlugin =
  (pluginConfig: VisualEditingPluginConfig = {}): Plugin =>
  (config) => {
    const skipCols = new Set([...INTERNAL_COLLECTIONS, ...(pluginConfig.skipCollections ?? [])]);
    const skipGlobals = new Set(pluginConfig.skipGlobals);
    const adminBasePath = pluginConfig.adminBasePath ?? "/admin";
    const excludeValues = pluginConfig.excludeValues ?? defaultExcludeValues;
    const enrichment = pluginConfig.enrichment ?? "auto";
    const instantPreview = pluginConfig.instantPreview ?? false;
    const excludeFieldNames = pluginConfig.excludeFieldNames ?? [];
    const instantPreviewOptions = {
      excludeFieldNames,
      rootLivePreview: config.admin?.livePreview,
    };

    const schemaCache = createSchemaCache({ excludeFieldNames });
    const { collectionAfterOperation, globalAfterRead, globalBeforeOperation } = createReadHooks({
      schemaCache,
      excludeValues,
      adminBasePath,
      enrichment,
      instantPreview,
    });
    const stripStega = createStripStegaHook();
    const unsavedRichText = instantPreview ? [createUnsavedRichTextHook(schemaCache)] : [];
    const globalUnsavedRichText = instantPreview
      ? [createGlobalUnsavedRichTextHook(schemaCache)]
      : [];

    return {
      ...config,
      custom: instantPreview ? withSchemaCache(config.custom, schemaCache) : config.custom,
      collections: config.collections?.map((collection) => {
        if (skipCols.has(collection.slug)) return collection;
        const withHooks: CollectionConfig = {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeChange: [...(collection.hooks?.beforeChange ?? []), stripStega],
            beforeRead: [...(collection.hooks?.beforeRead ?? []), ...unsavedRichText],
            afterOperation: [...(collection.hooks?.afterOperation ?? []), collectionAfterOperation],
          },
        };
        return instantPreview
          ? withInstantPreviewCollection(withHooks, instantPreviewOptions)
          : withHooks;
      }),
      globals: config.globals?.map((global) => {
        if (skipGlobals.has(global.slug)) return global;
        const withHooks: GlobalConfig = {
          ...global,
          hooks: {
            ...global.hooks,
            beforeOperation: [...(global.hooks?.beforeOperation ?? []), globalBeforeOperation],
            beforeRead: [...(global.hooks?.beforeRead ?? []), ...globalUnsavedRichText],
            beforeChange: [...(global.hooks?.beforeChange ?? []), stripStega],
            afterRead: [...(global.hooks?.afterRead ?? []), globalAfterRead],
          },
        };
        return instantPreview
          ? withInstantPreviewGlobal(withHooks, instantPreviewOptions)
          : withHooks;
      }),
      admin: {
        ...config.admin,
        components: {
          ...config.admin?.components,
          providers: [
            ...(config.admin?.components?.providers ?? []),
            {
              path: BRIDGE_COMPONENT_PATH,
              clientProps: { adminBasePath },
            },
          ],
        },
      },
    };
  };
