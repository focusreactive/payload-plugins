export { foldersPlugin, pluginSlug } from "./plugin.js";
export type { FoldersPluginOptions, PageCollectionOptions } from "./types.js";
export {
  buildUrl,
  joinPath,
  normalizePath,
  parentPathOf,
  pathDepth,
  prefixesOf,
  splitPath,
  toStoryblokFullSlug,
} from "./core/paths.js";
export { isValidSegment, SEGMENT_PATTERN, slugify } from "./core/slugify.js";
