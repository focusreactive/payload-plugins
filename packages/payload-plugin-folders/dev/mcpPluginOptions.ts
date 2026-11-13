import type { MCPPluginConfig } from "@payloadcms/plugin-mcp";

const builtinCollectionTools = [
  "count",
  "countVersions",
  "create",
  "delete",
  "duplicate",
  "find",
  "findDistinct",
  "findVersionByID",
  "findVersions",
  "getCollectionSchema",
  "getUploadInstructions",
  "restoreVersion",
  "update",
] as const;

const builtinGlobalTools = [
  "countGlobalVersions",
  "find",
  "findGlobalVersionByID",
  "findGlobalVersions",
  "getGlobalSchema",
  "restoreGlobalVersion",
  "update",
] as const;

const exposedTools: readonly string[] = ["find", "create", "update", "delete"];

const switchedOffTools = (keep: readonly string[]) =>
  Object.fromEntries(
    builtinCollectionTools.filter((tool) => !keep.includes(tool)).map((tool) => [tool, false])
  );

// The plugin registers every built-in tool for every collection and global in the config and has
// no per-collection enable flag, so one is left out by switching each of its tools off.
const hiddenCollections = ["users", "redirects", "folder-redirects", "folder-operations"];
const exposedCollections = ["folders", "pages", "posts"];
const hiddenGlobals = ["folders-tree-state"];

/**
 * The options `FOLDERS_MCP=true` gives `@payloadcms/plugin-mcp` in the dev app: find, create,
 * update and delete on the folders, pages and posts collections and nothing else, which is what a
 * host that only turns the plugin on for its content collections ends up with.
 */
export const mcpPluginOptions = (): MCPPluginConfig => ({
  collections: {
    ...Object.fromEntries(
      exposedCollections.map((slug) => [slug, { tools: switchedOffTools(exposedTools) }])
    ),
    ...Object.fromEntries(hiddenCollections.map((slug) => [slug, { tools: switchedOffTools([]) }])),
  } as MCPPluginConfig["collections"],
  globals: Object.fromEntries(
    hiddenGlobals.map((slug) => [
      slug,
      { tools: Object.fromEntries(builtinGlobalTools.map((tool) => [tool, false])) },
    ])
  ) as MCPPluginConfig["globals"],
});
