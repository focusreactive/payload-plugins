import { definePlugin } from "payload";
import type { Config } from "payload";

import { pluginSlug } from "./constants.js";
import { normalizeOptions, stripUniqueFromSegmentFields } from "./options.js";
import type { FoldersPluginOptions } from "./types.js";

export { pluginSlug } from "./constants.js";

export const foldersPlugin = definePlugin<FoldersPluginOptions>({
  slug: pluginSlug,
  plugin: ({ config, options }) => {
    const resolved = normalizeOptions(options ?? { collections: {} }, config);

    const hostOnInit = config.onInit;
    const warnOnInit: Config["onInit"] = async (payload) => {
      await hostOnInit?.(payload);
      for (const warning of resolved.warnings) {
        payload.logger.warn(`[folders] ${warning}`);
      }
    };

    return {
      ...config,
      collections: stripUniqueFromSegmentFields(config.collections ?? [], resolved),
      onInit: warnOnInit,
    };
  },
});
