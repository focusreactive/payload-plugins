import type { MCPPluginConfig } from "@payloadcms/plugin-mcp";
import type { Config, PayloadRequest } from "payload";

import type { ResolvedOptions } from "../types.js";
import type { McpLocales } from "./locales.js";

/** One top-level tool of `@payloadcms/plugin-mcp`, the shape the folders plugin's tools take. */
export type FoldersMcpTool = NonNullable<MCPPluginConfig["tools"]>[string];

export type FoldersMcpToolResponse = Awaited<ReturnType<FoldersMcpTool["handler"]>>;

/** What a tool is built from, known when the plugin runs. */
export type FoldersMcpContext = {
  /** The locale keys at plugin time; a handler reads the live ones from the request. */
  locales: McpLocales;
  options: ResolvedOptions;
};

export type FoldersMcpToolArguments = { input: Record<string, unknown>; req: PayloadRequest };

export type BuildFoldersMcpTools = (
  options: ResolvedOptions,
  config: Config
) => Record<string, FoldersMcpTool>;
