import { definePlugin } from "payload";
import type { CollectionConfig, Config } from "payload";

import { registerResolvedOptions } from "./core/runtime.js";
import { installTreeLockTracking, seedTreeState } from "./core/treeLock.js";
import { buildFolderOperationsCollection } from "./collections/folderOperations.js";
import { buildFolderRedirectsCollection } from "./collections/folderRedirects.js";
import { buildFoldersCollection } from "./collections/folders.js";
import { pluginSlug } from "./constants.js";
import { buildFoldersEndpoints } from "./endpoints/index.js";
import { addPageFields } from "./fields/pageFields.js";
import { mergeFoldersTranslations } from "./translations/index.js";
import { buildTreeStateGlobal } from "./globals/treeState.js";
import {
  inspectRuntimeDatabase,
  normalizeOptions,
  stripUniqueFromSegmentFields,
} from "./options.js";
import type { FoldersPluginOptions } from "./types.js";

export { pluginSlug } from "./constants.js";

export const foldersPlugin = definePlugin<FoldersPluginOptions>({
  slug: pluginSlug,
  plugin: ({ config, options }) => {
    const resolved = normalizeOptions(options ?? { collections: {} }, config);

    const hostCollections = stripUniqueFromSegmentFields(config.collections ?? [], resolved);
    const pageCollections = hostCollections.map(
      (collection): CollectionConfig =>
        resolved.collections[collection.slug]
          ? addPageFields(collection, resolved.collections[collection.slug], resolved)
          : collection
    );

    const hostOnInit = config.onInit;
    const warnOnInit: Config["onInit"] = async (payload) => {
      if (!resolved.disabled) {
        registerResolvedOptions(payload, resolved);
      }
      await hostOnInit?.(payload);
      if (!resolved.disabled) {
        await seedTreeState(payload);
      }
      for (const warning of [...resolved.warnings, ...inspectRuntimeDatabase(payload.db)]) {
        payload.logger.warn(`[folders] ${warning}`);
      }
    };

    // Wrapping the adapter's init is the earliest point that has the Payload instance, and the
    // lock has to track transactions from the very first one.
    const hostDatabase = config.db;
    const database: Config["db"] =
      !resolved.disabled && hostDatabase && typeof hostDatabase.init === "function"
        ? {
            ...hostDatabase,
            init: (args) => {
              const adapter = hostDatabase.init(args);
              installTreeLockTracking(args.payload, adapter);
              registerResolvedOptions(args.payload, resolved);

              return adapter;
            },
          }
        : hostDatabase;

    return {
      ...config,
      db: database,
      i18n: resolved.disabled
        ? config.i18n
        : ({
            ...config.i18n,
            translations: mergeFoldersTranslations(
              config.i18n?.translations as Parameters<typeof mergeFoldersTranslations>[0],
              Object.keys(config.i18n?.supportedLanguages ?? {})
            ),
          } as Config["i18n"]),
      endpoints: [
        ...(config.endpoints ?? []),
        ...(resolved.disabled ? [] : buildFoldersEndpoints(resolved)),
      ],
      collections: [
        ...pageCollections,
        buildFoldersCollection(resolved),
        buildFolderRedirectsCollection(resolved),
        buildFolderOperationsCollection(config.admin?.user ?? "users"),
      ],
      globals: [...(config.globals ?? []), buildTreeStateGlobal()],
      onInit: warnOnInit,
    };
  },
});
