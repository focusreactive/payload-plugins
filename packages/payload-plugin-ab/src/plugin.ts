import type { CollectionConfig, Config, Plugin } from "payload";
import type { AbTestingPluginConfig } from "./types/config";
import { injectAdminFields } from "./utils/injectAdminFields";
import { buildParentAfterChangeHook } from "./hooks/buildParentAfterChangeHook";
import { buildParentAfterDeleteHook } from "./hooks/buildParentAfterDeleteHook";
import { buildParentBeforeChangeHook } from "./hooks/buildParentBeforeChangeHook";
import { duplicateVariantHandler } from "./endpoints/duplicateVariant";
import { buildExperimentsCollection } from "./collections/buildExperimentsCollection";
import { AB_EXPERIMENTS_SLUG, PLUGIN_NAME } from "./constants";

const PREFIX = `[${PLUGIN_NAME}]`;

export const abTestingPlugin =
  <TVariantData extends object>(pluginConfig: AbTestingPluginConfig<TVariantData>): Plugin =>
  (incomingConfig: Config): Config => {
    const { enabled = true, debug = false, collections, storage } = pluginConfig;

    if (!enabled) return incomingConfig;

    if ((storage as typeof storage | undefined) == null) {
      console.warn(`${PREFIX} Disabled: required option "storage" is missing (provide a storage adapter, e.g. payloadGlobalAdapter() or vercelEdgeAdapter(...)). Plugin not registered.`);
      return incomingConfig;
    }

    if (!collections || Object.keys(collections).length === 0) {
      console.warn(`${PREFIX} Disabled: required option "collections" is missing or empty. Plugin not registered.`);
      return incomingConfig;
    }

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
          beforeChange: [...(withAdminFields.hooks?.beforeChange ?? []), buildParentBeforeChangeHook(collection.slug, abConfig, pluginConfig)],
          afterChange: [...(withAdminFields.hooks?.afterChange ?? []), buildParentAfterChangeHook(collection.slug, abConfig, pluginConfig)],
          afterDelete: [...(withAdminFields.hooks?.afterDelete ?? []), buildParentAfterDeleteHook(collection.slug, abConfig, pluginConfig)],
        },
      };
    });

    const experimentsSlug = pluginConfig.experimentsCollectionSlug ?? AB_EXPERIMENTS_SLUG;
    const experimentsCollection = buildExperimentsCollection(debug, experimentsSlug);

    return {
      ...incomingConfig,
      collections: [...patchedCollections, experimentsCollection],
      globals: [...(incomingConfig.globals ?? []), ...extraGlobals],
      endpoints: [
        ...(incomingConfig.endpoints ?? []),
        {
          path: "/_ab/duplicate",
          method: "post",
          handler: duplicateVariantHandler,
        },
      ],
    };
  };
