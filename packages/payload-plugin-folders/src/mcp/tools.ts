import type { ResolvedOptions } from "../types.js";
import type { FoldersMcpTool } from "./types.js";

/** Every tool the plugin offers to plugin-mcp, by the name the model sees. */
export const buildFoldersMcpTools = (
  _options: ResolvedOptions
): Record<string, FoldersMcpTool> => ({});
