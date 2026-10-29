export const pluginSlug = "@focus-reactive/payload-plugin-folders";

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
] as const;

/** Segments the frontend or Payload itself owns, whatever the config says. */
export const fixedReservedRootSegments = ["graphql", "graphql-playground", "_next"] as const;
