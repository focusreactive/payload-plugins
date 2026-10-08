import type { Plugin } from "payload";

import type { ValueExcludePredicate } from "./excludeValues.js";
import type { Enrichment } from "./internal/gate.js";

import { defaultExcludeValues } from "./excludeValues.js";
import { createAfterOperationHook } from "./internal/afterOperationHook.js";
import { createAfterReadHook } from "./internal/afterReadHook.js";
import {
  createBeforeOperationHook,
  createGlobalBeforeReadHook,
} from "./internal/beforeOperationHook.js";
import { createGlobalAfterReadHook } from "./internal/globalAfterReadHook.js";
import { createSchemaCache } from "./internal/schemaCache.js";
import { createStripStegaHook } from "./internal/stripStegaHook.js";

export {
  defaultExcludeValues,
  isHash,
  isIsoDate,
  isSlug,
  isUrl,
  type ValueExcludePredicate,
} from "./excludeValues.js";

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

const BRIDGE_COMPONENT_PATH =
  "@focus-reactive/payload-plugin-visual-editing/admin#VisualEditingBridgeProvider";

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
};

export const visualEditingPlugin =
  (pluginConfig: VisualEditingPluginConfig = {}): Plugin =>
  (config) => {
    const skipCols = new Set([...INTERNAL_COLLECTIONS, ...(pluginConfig.skipCollections ?? [])]);
    const skipGlobals = new Set(pluginConfig.skipGlobals);
    const adminBasePath = pluginConfig.adminBasePath ?? "/admin";
    const excludeValues = pluginConfig.excludeValues ?? defaultExcludeValues;
    const enrichment = pluginConfig.enrichment ?? "auto";

    const schemaCache = createSchemaCache({
      excludeFieldNames: pluginConfig.excludeFieldNames,
    });
    const beforeOperation = createBeforeOperationHook();
    const afterRead = createAfterReadHook(adminBasePath, enrichment);
    const afterOperation = createAfterOperationHook({
      schemaCache,
      excludeValues,
      adminBasePath,
      enrichment,
    });
    const globalBeforeRead = createGlobalBeforeReadHook();
    const globalAfterRead = createGlobalAfterReadHook({
      schemaCache,
      excludeValues,
      adminBasePath,
      enrichment,
    });
    const stripStega = createStripStegaHook();

    return {
      ...config,
      collections: config.collections?.map((collection) => {
        if (skipCols.has(collection.slug)) return collection;
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeOperation: [...(collection.hooks?.beforeOperation ?? []), beforeOperation],
            beforeChange: [...(collection.hooks?.beforeChange ?? []), stripStega],
            afterRead: [...(collection.hooks?.afterRead ?? []), afterRead],
            afterOperation: [...(collection.hooks?.afterOperation ?? []), afterOperation],
          },
        };
      }),
      globals: config.globals?.map((global) => {
        if (skipGlobals.has(global.slug)) return global;
        return {
          ...global,
          hooks: {
            ...global.hooks,
            beforeRead: [...(global.hooks?.beforeRead ?? []), globalBeforeRead],
            beforeChange: [...(global.hooks?.beforeChange ?? []), stripStega],
            afterRead: [...(global.hooks?.afterRead ?? []), globalAfterRead],
          },
        };
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
