export const PLUGIN_NAME = "payload-plugin-content-releases";

export const RELEASES_SLUG = "releases" as const;
export const RELEASE_ITEMS_SLUG = "release-items" as const;

export const RELEASE_STATUSES = [
  "draft", "scheduled", "publishing", "published", "failed", "cancelled",
] as const;

export const RELEASE_ITEM_ACTIONS = ["publish", "unpublish"] as const;

export const RELEASE_ITEM_STATUSES = [
  "pending", "published", "failed", "skipped",
] as const;

export const DEFAULT_CONFLICT_STRATEGY = "fail" as const;
export const DEFAULT_PUBLISH_BATCH_SIZE = 20;
export const DEFAULT_USE_TRANSACTIONS = true;
