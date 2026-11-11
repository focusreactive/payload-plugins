import type { Config, Plugin, PluginsMap } from "payload";

import { mcpPluginSlug } from "../constants.js";
import type { ResolvedOptions } from "../types.js";
import { buildFoldersMcpTools } from "./tools.js";
import type { FoldersMcpTool } from "./types.js";

type McpPluginOptions = { tools?: Record<string, FoldersMcpTool> } & Record<string, unknown>;

/** The tools the host did not switch off with the plugin's `mcp` option. */
export const selectFoldersMcpTools = (
  options: ResolvedOptions,
  tools: Record<string, FoldersMcpTool>
): Record<string, FoldersMcpTool> => {
  if (!options.mcp) {
    return {};
  }
  const disabledTools = new Set(options.mcp.disabledTools);

  return Object.fromEntries(Object.entries(tools).filter(([name]) => !disabledTools.has(name)));
};

/**
 * Adds the plugin's MCP tools to the options of `@payloadcms/plugin-mcp`, when that plugin is
 * registered. Payload runs plugins in ascending `order` and plugin-mcp's is 10, against this
 * plugin's default 0, so the options are still editable here. A plugin built with `definePlugin`
 * reads `options` only when it runs, which also covers a host that registered plugin-mcp with none.
 * What the host set wins on every name.
 */
export const addToolsToMcpPlugin = (
  plugins: PluginsMap,
  options: ResolvedOptions,
  config: Config
): void => {
  const mcpPlugin: Plugin | undefined = plugins[mcpPluginSlug];
  if (!mcpPlugin || options.disabled) {
    return;
  }
  const tools = selectFoldersMcpTools(options, buildFoldersMcpTools(options, config));
  if (Object.keys(tools).length === 0) {
    return;
  }

  const hostOptions = (mcpPlugin.options ?? {}) as McpPluginOptions;
  mcpPlugin.options = { ...hostOptions, tools: { ...tools, ...hostOptions.tools } };
};
