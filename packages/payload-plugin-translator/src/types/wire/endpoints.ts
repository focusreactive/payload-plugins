/**
 * Every route the admin talks to, relative to the plugin's `basePath`. The one spelling of each
 * path: the client, the stub and the real routes all read it from here.
 */
export const ENDPOINTS = {
  documentState: { method: "get", path: "/document-state/:collection_slug/:collection_id" },
  listState: { method: "get", path: "/list-state/:collection_slug" },
  enqueue: { method: "post", path: "/enqueue" },
  enqueueList: { method: "post", path: "/enqueue-list" },
  cancel: { method: "delete", path: "/cancel" },
  runNow: { method: "post", path: "/run/:collection_slug/:collection_id" },
  dismissStaleness: { method: "post", path: "/stale/dismiss" },
  translateField: { method: "post", path: "/field" },
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
