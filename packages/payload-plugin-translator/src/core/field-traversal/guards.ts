import { isObject } from "../utils/isObject";
import type { FieldLike, TabsFieldLike } from "./types";

/**
 * Type guard: Checks if a field is a tabs field.
 */
export function isTabsField(field: FieldLike): field is TabsFieldLike {
  return field.type === "tabs";
}

/**
 * Type guard: Checks if value is a block item (has blockType property).
 */
export function isBlockItem(
  value: unknown
): value is Record<string, unknown> & { blockType: string } {
  return isObject(value) && "blockType" in value && typeof value.blockType === "string";
}

/**
 * Type guard: Checks if value has a fields array property.
 * Works with any field/tab-like object; narrows to the framework-agnostic {@link FieldLike}
 * so the field-traversal kernel that consumes it stays free of Payload types.
 */
export function hasFields(value: unknown): value is { fields: FieldLike[] } {
  return isObject(value) && "fields" in value && Array.isArray(value.fields);
}
