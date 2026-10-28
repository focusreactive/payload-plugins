import { definePlugin } from "payload";

import type { FoldersPluginOptions } from "./types.js";

export const pluginSlug = "@focus-reactive/payload-plugin-folders";

export const foldersPlugin = definePlugin<FoldersPluginOptions>({
  slug: pluginSlug,
  plugin: ({ config }) => config,
});
