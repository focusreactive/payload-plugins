import type { CollectionConfig, Config, Plugin } from "payload";
import type { AbTestingPluginConfig } from "./types/config";
import { injectAdminFields } from "./utils/injectAdminFields";
import { buildParentAfterChangeHook } from "./hooks/buildParentAfterChangeHook";
import { buildParentAfterDeleteHook } from "./hooks/buildParentAfterDeleteHook";
import { buildParentBeforeChangeHook } from "./hooks/buildParentBeforeChangeHook";
import { buildDuplicateVariantHandler } from "./endpoints/duplicateVariant";

export const abTestingPlugin =
  <TVariantData extends object>(pluginConfig: AbTestingPluginConfig<TVariantData>): Plugin =>
  (incomingConfig: Config): Config => {
    const { enabled = true, debug = false, collections, storage } = pluginConfig;

    if (!enabled) return incomingConfig;

    const extraGlobals = storage.createGlobal ? [storage.createGlobal(debug)] : [];

    const patchedCollections = (incomingConfig.collections ?? []).map((collection): CollectionConfig => {
      const abConfig = collections[collection.slug];
      if (!abConfig) return collection;

      // Inject admin fields (UI panel, hidden data fields, list filter)
      const withAdminFields = injectAdminFields(collection, collection.slug, abConfig);

      // Inject hooks
      return {
        ...withAdminFields,
        hooks: {
          ...withAdminFields.hooks,
          beforeChange: [
            ...(withAdminFields.hooks?.beforeChange ?? []),
            buildParentBeforeChangeHook(collection.slug, abConfig, pluginConfig),
          ],
          afterChange: [
            ...(withAdminFields.hooks?.afterChange ?? []),
            buildParentAfterChangeHook(collection.slug, abConfig, pluginConfig),
          ],
          afterDelete: [
            ...(withAdminFields.hooks?.afterDelete ?? []),
            buildParentAfterDeleteHook(collection.slug, abConfig, pluginConfig),
          ],
        },
      };
    });

    return {
      ...incomingConfig,
      collections: patchedCollections,
      globals: [...(incomingConfig.globals ?? []), ...extraGlobals],
      endpoints: [
        ...(incomingConfig.endpoints ?? []),
        {
          path: "/_ab/duplicate",
          method: "post",
          handler: buildDuplicateVariantHandler(pluginConfig),
        },
      ],
    };
  };
