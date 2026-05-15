import type { Field } from "payload";
import {
  fieldAffectsData,
  fieldIsArrayType,
  fieldIsBlockType,
  fieldIsGroupType,
} from "payload/shared";

import {
  hasFields,
  isBlockItem,
  isLocalizedField,
  isTabsField,
  isTranslatableField,
} from "../guards";
import { isEmpty } from "./isEmpty";
import { isObject } from "./isObject";

/**
 * Filters data to keep only translatable localized fields.
 * For container fields (group, array, blocks) recursively filters nested data.
 *
 * @param schema - Payload field schema (original, not sanitized)
 * @param data - Document data to filter
 * @returns Filtered data containing only translatable localized fields
 */
export function filterLocalizedFields(
  schema: Field[],
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of schema) {
    if (isTabsField(field)) {
      for (const tab of field.tabs) {
        if (hasFields(tab))
          {Object.assign(result, filterLocalizedFields(tab.fields, data));}
      }
      continue;
    }

    if (!fieldAffectsData(field)) {
      if (hasFields(field))
        {Object.assign(result, filterLocalizedFields(field.fields, data));}
      continue;
    }

    const value = data[field.name];
    if (value === undefined) {continue;}

    if (fieldIsGroupType(field) && isObject(value)) {
      const filtered = filterLocalizedFields(field.fields, value);
      if (!isEmpty(filtered)) {result[field.name] = filtered;}
      continue;
    }

    if (fieldIsArrayType(field) && Array.isArray(value)) {
      const filteredArray = value
        .map((item) => {
          if (isObject(item)) {
            const filtered = filterLocalizedFields(field.fields, item);
            if (!isEmpty(filtered)) {return { ...filtered, id: item.id };}
          }
          return null;
        })
        .filter(Boolean);

      if (!isEmpty(filteredArray)) {result[field.name] = filteredArray;}
      continue;
    }

    if (fieldIsBlockType(field) && Array.isArray(value)) {
      const filteredBlocks = value
        .map((item) => {
          if (isBlockItem(item)) {
            const block = field.blocks.find((b) => b.slug === item.blockType);
            if (block) {
              const filtered = filterLocalizedFields(block.fields, item);
              if (!isEmpty(filtered))
                {return { ...filtered, blockType: item.blockType, id: item.id };}
            }
          }
          return null;
        })
        .filter(Boolean);

      if (!isEmpty(filteredBlocks)) {result[field.name] = filteredBlocks;}
      continue;
    }

    if (isTranslatableField(field) && isLocalizedField(field)) {
      result[field.name] = value;
      continue;
    }
  }

  return result;
}
