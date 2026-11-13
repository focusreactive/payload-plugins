import type { Config, Plugin, PluginsMap } from "payload";

import {
  folderOperationsSlug,
  folderRedirectsSlug,
  mcpPluginSlug,
  treeStateSlug,
} from "../constants.js";
import type { ResolvedOptions } from "../types.js";
import { buildStockToolDescriptions, foldersMcpInstructions } from "./instructions.js";
import { isFoldersMcpToolOn } from "./toolSwitch.js";
import { buildFoldersMcpTools } from "./tools.js";
import type { FoldersMcpTool } from "./types.js";

type ToolEntries = Record<string, unknown>;

type EntityOptions = { tools?: ToolEntries } & Record<string, unknown>;

type McpPluginOptions = {
  collections?: Record<string, EntityOptions>;
  globals?: Record<string, EntityOptions>;
  mcp?: {
    serverOptions?: { options?: { instructions?: string } & Record<string, unknown> } & Record<
      string,
      unknown
    >;
  } & Record<string, unknown>;
  tools?: Record<string, FoldersMcpTool>;
} & Record<string, unknown>;

/**
 * The stock tool keys of `@payloadcms/plugin-mcp` 4.0.0-beta.5 for a collection and for a global.
 * The plugin registers every one of them for every collection and global in the config and has no
 * flag to leave an entity out, so one is left out by setting each key to false.
 */
const stockCollectionToolKeys = [
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

const stockGlobalToolKeys = [
  "countGlobalVersions",
  "find",
  "findGlobalVersionByID",
  "findGlobalVersions",
  "getGlobalSchema",
  "restoreGlobalVersion",
  "update",
] as const;

/** The stock tools whose description the plugin writes, by the key plugin-mcp uses. */
const describedToolKeys = ["create", "find", "update"] as const;

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

const isEntityToolSet = (entry: unknown): boolean => entry !== undefined && entry !== null;

/** Tools the host left unset on `hostEntity`, switched off. A key the host set, to anything, stays. */
const switchOffUnsetTools = (
  hostEntity: EntityOptions | undefined,
  keys: readonly string[]
): EntityOptions => {
  const hostTools = hostEntity?.tools ?? {};
  const switchedOff = Object.fromEntries(
    keys.filter((key) => !isEntityToolSet(hostTools[key])).map((key) => [key, false])
  );

  return { ...hostEntity, tools: { ...switchedOff, ...hostTools } };
};

const hostDescriptionOf = (entry: unknown): string | undefined =>
  typeof entry === "object" && entry !== null && "description" in entry
    ? ((entry as { description?: unknown }).description as string | undefined)
    : undefined;

/**
 * Sets the descriptions of the stock create, find and update tools on the folders collection and on
 * every page collection. plugin-mcp shows one description per tool, from the first collection that
 * has it, so one text goes on every collection. A tool the host switched off on a collection is
 * left off. A description the host wrote wins: the first one in config order, which is the one
 * plugin-mcp would show, is copied to the collections that have none, so the host's text is the one
 * the model reads whichever collection comes first.
 */
const describeStockTools = ({
  collectionSlugs,
  config,
  hostCollections,
  options,
}: {
  collectionSlugs: string[];
  config: Config;
  hostCollections: Record<string, EntityOptions>;
  options: ResolvedOptions;
}): Record<string, EntityOptions> => {
  const descriptions = buildStockToolDescriptions({
    browseTree: isFoldersMcpToolOn(options, "browseTree"),
    canMove:
      isFoldersMcpToolOn(options, "previewMove") && isFoldersMcpToolOn(options, "applyTreeChange"),
    canRename:
      isFoldersMcpToolOn(options, "previewRename") &&
      isFoldersMcpToolOn(options, "applyTreeChange"),
    createFolder: isFoldersMcpToolOn(options, "createFolder"),
  });
  const configOrder = (config.collections ?? []).map((collection) => collection.slug);
  const rank = (slug: string): number =>
    configOrder.includes(slug) ? configOrder.indexOf(slug) : configOrder.length;
  const inConfigOrder = [...collectionSlugs].toSorted((left, right) => rank(left) - rank(right));

  const result: Record<string, EntityOptions> = {};
  for (const slug of collectionSlugs) {
    result[slug] = { ...hostCollections[slug], tools: { ...hostCollections[slug]?.tools } };
  }
  for (const key of describedToolKeys) {
    const hostText = inConfigOrder
      .map((slug) => hostDescriptionOf(hostCollections[slug]?.tools?.[key]))
      .find((text) => typeof text === "string" && text !== "");
    for (const slug of collectionSlugs) {
      const entry = hostCollections[slug]?.tools?.[key];
      if (entry === false || hostDescriptionOf(entry)) {
        continue;
      }
      (result[slug].tools as ToolEntries)[key] = {
        ...(typeof entry === "object" && entry !== null ? entry : {}),
        description: hostText ?? descriptions[key],
      };
    }
  }

  return result;
};

/**
 * The server instructions: the host's own text first, the folders text after it, separated by a
 * blank line. Without the host's, the folders text alone.
 */
const withInstructions = (hostOptions: McpPluginOptions): McpPluginOptions["mcp"] => {
  const hostMcp = hostOptions.mcp ?? {};
  const hostServerOptions = hostMcp.serverOptions ?? {};
  const hostText = hostServerOptions.options?.instructions;
  const instructions = hostText
    ? `${hostText}\n\n${foldersMcpInstructions}`
    : foldersMcpInstructions;

  return {
    ...hostMcp,
    serverOptions: {
      ...hostServerOptions,
      options: { ...hostServerOptions.options, instructions },
    },
  };
};

/**
 * Adds the plugin's MCP tools, stock tool descriptions, switch-offs and server instructions to the
 * options of `@payloadcms/plugin-mcp`, when that plugin is registered. Payload runs plugins in
 * ascending `order` and plugin-mcp's is 10, against this plugin's default 0, so the options are
 * still editable here. A plugin built with `definePlugin` reads `options` only when it runs, which
 * also covers a host that registered plugin-mcp with none. What the host set wins on every key.
 */
export const addToolsToMcpPlugin = (
  plugins: PluginsMap,
  options: ResolvedOptions,
  config: Config
): void => {
  const mcpPlugin: Plugin | undefined = plugins[mcpPluginSlug];
  if (!mcpPlugin || options.disabled || !options.mcp) {
    return;
  }
  const tools = selectFoldersMcpTools(options, buildFoldersMcpTools(options, config));

  const hostOptions = (mcpPlugin.options ?? {}) as McpPluginOptions;
  const hostCollections = hostOptions.collections ?? {};
  const collectionSlugs = [options.folders.slug, ...Object.keys(options.collections)];
  const describedCollections = describeStockTools({
    collectionSlugs,
    config,
    hostCollections,
    options,
  });

  mcpPlugin.options = {
    ...hostOptions,
    collections: {
      ...hostCollections,
      ...describedCollections,
      [folderRedirectsSlug]: switchOffUnsetTools(
        hostCollections[folderRedirectsSlug],
        stockCollectionToolKeys
      ),
      [folderOperationsSlug]: switchOffUnsetTools(
        hostCollections[folderOperationsSlug],
        stockCollectionToolKeys
      ),
    },
    globals: {
      ...hostOptions.globals,
      [treeStateSlug]: switchOffUnsetTools(
        hostOptions.globals?.[treeStateSlug],
        stockGlobalToolKeys
      ),
    },
    ...(options.mcp.instructions ? { mcp: withInstructions(hostOptions) } : {}),
    tools: { ...tools, ...hostOptions.tools },
  };
};
