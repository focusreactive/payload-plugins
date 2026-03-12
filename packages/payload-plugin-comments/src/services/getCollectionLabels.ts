import type { Payload } from "payload";
import type { CollectionLabels } from "../types";

export function getCollectionLabels(payload: Payload, enabledSlugs: string[]) {
  const slugSet = new Set(enabledSlugs);
  const result: CollectionLabels = {};

  for (const collection of payload.config.collections) {
    if (!slugSet.has(collection.slug)) continue;

    const rawLabel = collection.labels?.plural;

    result[collection.slug] = typeof rawLabel === "function" || rawLabel === undefined ? collection.slug : rawLabel;
  }

  return result;
}
