import type { ResolvedOptions } from "../types.js";

/** Whether the plugin offers `toolName` through plugin-mcp: the `mcp` option is on and the tool is not switched off. */
export const isFoldersMcpToolOn = (options: ResolvedOptions, toolName: string): boolean =>
  options.mcp !== false && !options.mcp.disabledTools.includes(toolName);
