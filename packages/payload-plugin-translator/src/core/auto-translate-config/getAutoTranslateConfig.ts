import { isObject } from "../kernel/utils/isObject";

import type { AutoTranslateConfig } from "./types";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "./types";

/**
 * Structural guard: is `value` a well-formed auto-translate config? Validates the one crash-critical
 * invariant — `targets` is an array of strings — so a foreign value that a consumer happened to store
 * under {@link AUTO_TRANSLATE_CUSTOM_KEY} (the key is a shared `custom` namespace, so a collision, while
 * unlikely, is possible) is treated as "not opted in" rather than crashing the readers that dereference
 * `targets`.
 */
function isAutoTranslateConfig(value: unknown): value is AutoTranslateConfig {
  if (!isObject(value)) return false;
  const { targets } = value;
  return Array.isArray(targets) && targets.every((target) => typeof target === "string");
}

/**
 * Read a collection's auto-translate rule from its `custom` bag, or `null` when the collection is not
 * opted in. Payload-free (only the `custom` extension point is read), mirroring
 * `getFieldTranslationConfig` at the field level. Returns `null` when the key is absent OR holds a value
 * that is not a valid config, so a foreign `custom.{key}` collision can never crash a caller.
 *
 * @param collection - The collection to read (only its `custom` extension point is inspected).
 * @returns The auto-translate config, or `null` when absent/malformed.
 * @since 0.9.0
 */
export function getAutoTranslateConfig(collection: {
  custom?: Record<string, unknown>;
}): AutoTranslateConfig | null {
  if (!isObject(collection.custom)) return null;
  const value = collection.custom[AUTO_TRANSLATE_CUSTOM_KEY];
  return isAutoTranslateConfig(value) ? value : null;
}
