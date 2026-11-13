/**
 * Every route the admin talks to, relative to the plugin's `basePath`. The one spelling of each
 * path: the client, the stub and the real routes all read it from here.
 */
export const ENDPOINTS = {
  documentState: { method: "get", path: "/document-state/:collection_slug/:collection_id" },
  listState: { method: "get", path: "/list-state/:collection_slug" },
  enqueue: { method: "post", path: "/enqueue" },
  cancel: { method: "delete", path: "/cancel" },
  cancelByCollection: { method: "delete", path: "/cancel-by-collection/:collection_slug" },
  runNow: { method: "post", path: "/run/:id" },
  dismissStaleness: { method: "post", path: "/stale/dismiss" },
  translateField: { method: "post", path: "/field" },
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
