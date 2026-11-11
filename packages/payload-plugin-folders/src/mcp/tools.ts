import { noLocaleKey } from "../core/locales.js";
import { buildBrowseTreeTool } from "./browseTree.js";
import { buildCreateFolderTool } from "./createFolder.js";
import { describeLocales } from "./locales.js";
import { buildPreviewMoveTool } from "./previewMove.js";
import type { BuildFoldersMcpTools } from "./types.js";

/** Every tool the plugin offers to plugin-mcp, by the name the model sees. */
export const buildFoldersMcpTools: BuildFoldersMcpTools = (options, config) => {
  const locales = describeLocales(config.localization);
  const areFolderTextsLocalized = locales.isLocalized && options.localizeSegments;

  const collections = [options.folders.slug, ...Object.keys(options.collections)];

  return {
    browseTree: buildBrowseTreeTool(options, collections),
    createFolder: buildCreateFolderTool(options, {
      defaultKey: areFolderTextsLocalized ? locales.defaultLocale : noLocaleKey,
      keys: areFolderTextsLocalized ? locales.codes : [noLocaleKey],
    }),
    previewMove: buildPreviewMoveTool(options, collections),
  };
};
