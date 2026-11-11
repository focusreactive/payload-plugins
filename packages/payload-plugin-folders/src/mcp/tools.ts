import { noLocaleKey } from "../core/locales.js";
import { buildApplyTreeChangeTool } from "./applyTreeChange.js";
import { buildBrowseTreeTool } from "./browseTree.js";
import { buildCreateFolderTool } from "./createFolder.js";
import { describeLocales } from "./locales.js";
import { buildPreviewMoveTool } from "./previewMove.js";
import { buildPreviewRenameTool } from "./previewRename.js";
import type { BuildFoldersMcpTools } from "./types.js";

/** Every tool the plugin offers to plugin-mcp, by the name the model sees. */
export const buildFoldersMcpTools: BuildFoldersMcpTools = (options, config) => {
  const locales = describeLocales(config.localization);
  const areFolderTextsLocalized = locales.isLocalized && options.localizeSegments;

  const collections = [options.folders.slug, ...Object.keys(options.collections)];
  const folderKeys = {
    defaultKey: areFolderTextsLocalized ? locales.defaultLocale : noLocaleKey,
    keys: areFolderTextsLocalized ? locales.codes : [noLocaleKey],
  };

  return {
    applyTreeChange: buildApplyTreeChangeTool(options),
    browseTree: buildBrowseTreeTool(options, collections),
    createFolder: buildCreateFolderTool(options, folderKeys),
    previewMove: buildPreviewMoveTool(options, collections),
    previewRename: buildPreviewRenameTool(options, folderKeys),
  };
};
