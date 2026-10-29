import { definePlugin } from "payload";
import type { CollectionConfig, Config } from "payload";

import { buildFolderOperationsCollection } from "./collections/folderOperations.js";
import { buildFolderRedirectsCollection } from "./collections/folderRedirects.js";
import { buildFoldersCollection } from "./collections/folders.js";
import { pluginSlug } from "./constants.js";
import { addPageFields } from "./fields/pageFields.js";
import { buildTreeStateGlobal } from "./globals/treeState.js";
import { normalizeOptions, stripUniqueFromSegmentFields } from "./options.js";
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
      await hostOnInit?.(payload);
      for (const warning of resolved.warnings) {
        payload.logger.warn(`[folders] ${warning}`);
      }
    };

    return {
      ...config,
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
