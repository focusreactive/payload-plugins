import type { MCPPluginConfig } from "@payloadcms/plugin-mcp";

/** One top-level tool of `@payloadcms/plugin-mcp`, the shape the folders plugin's tools take. */
export type FoldersMcpTool = NonNullable<MCPPluginConfig["tools"]>[string];
