import type { CollectionConfig } from "payload";

export type ManagedCollectionsConfig = {
  collections?: Array<Pick<CollectionConfig, "slug" | "custom" | "hooks">>;
};
