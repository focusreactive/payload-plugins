export const pluginSlug = "@focus-reactive/payload-plugin-folders";

/** The slug of the plugin's tab in the admin's sidebar (`admin.components.sidebar.tabs`). */
export const sidebarTabSlug = "folders-tree";

export const redirectsPluginSlug = "@payloadcms/plugin-redirects";

export const folderRedirectsSlug = "folder-redirects";
export const folderOperationsSlug = "folder-operations";
export const treeStateSlug = "folders-tree-state";

/** Field names the plugin injects into every opted-in page collection. */
export const injectedPageFieldNames = [
  "folder",
  "orderKey",
  "structureRevision",
  "isFolderRoot",
  "pathSegment",
  "folderPath",
  "fullPath",
  "folderUrlHistory",
  "folderDraftWarning",
] as const;

/** The page fields that hold its place in the tree: only a move or a reorder may change them. */
export const pageStructureFieldNames = ["folder", "orderKey", "structureRevision"] as const;

export type PageStructureField = (typeof pageStructureFieldNames)[number];

/** Segments the frontend or Payload itself owns, whatever the config says. */
export const fixedReservedRootSegments = ["graphql", "graphql-playground", "_next"] as const;

export const mcpPluginSlug = "@payloadcms/plugin-mcp";
