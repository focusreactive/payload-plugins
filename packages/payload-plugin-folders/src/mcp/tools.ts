import { buildBrowseTreeTool } from "./browseTree.js";
import type { BuildFoldersMcpTools } from "./types.js";

/** Every tool the plugin offers to plugin-mcp, by the name the model sees. */
export const buildFoldersMcpTools: BuildFoldersMcpTools = (options) => ({
  browseTree: buildBrowseTreeTool(options, [
    options.folders.slug,
    ...Object.keys(options.collections),
  ]),
});
