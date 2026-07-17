import type { AutoTranslateConfig } from "./types";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "./types";

/**
 * Read a collection's auto-translate rule from its `custom` bag, or `null` when the collection is not
 * opted in. Payload-free (only the `custom` extension point is read), mirroring
 * `getFieldTranslationConfig` at the field level.
 *
 * @param collection - The collection to read (only its `custom` extension point is inspected).
 * @returns The auto-translate config, or `null` when absent/malformed.
 * @since 0.9.0
 */
export function getAutoTranslateConfig(collection: {
  custom?: Record<string, unknown>;
}): AutoTranslateConfig | null {
  if (!collection.custom || typeof collection.custom !== "object") return null;
  const config = (collection.custom as Record<string, unknown>)[AUTO_TRANSLATE_CUSTOM_KEY];
  if (!config || typeof config !== "object") return null;
  return config as AutoTranslateConfig;
}
