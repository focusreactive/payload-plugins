import type { CollectionConfig, SanitizedCollectionConfig } from "payload";

type VersionsConfig = CollectionConfig["versions"];

/**
 * Type guard: Checks if versions config is an object (not boolean).
 */
function isVersionsObject(
  versions: VersionsConfig
): versions is Exclude<VersionsConfig, boolean | undefined> {
  return typeof versions === "object" && versions !== null;
}

/**
 * Checks if a collection has drafts enabled.
 * Handles both CollectionConfig and SanitizedCollectionConfig.
 */
export function collectionHasDrafts(
  collection: CollectionConfig | SanitizedCollectionConfig
): boolean {
  const { versions } = collection;

  if (!versions) {return false;}
  if (!isVersionsObject(versions)) {return false;}

  return "drafts" in versions && Boolean(versions.drafts);
}
