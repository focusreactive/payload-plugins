import type { Field } from "payload";
import {
  fieldAffectsData,
  fieldIsArrayType,
  fieldIsBlockType,
  fieldIsGroupType,
  tabHasName,
} from "payload/shared";

import {
  hasFields,
  isBlockItem,
  isLocalizedField,
  isObject,
  isTabsField,
  isTranslatableField,
  isFieldExcludedFromTranslation,
} from "../../../../shared";
import type { TranslationStrategy } from "../../strategies";
import type { FieldChunk } from "../../types";

/**
 * Collects FieldChunks by traversing schema and data in parallel.
 * Each chunk contains a reference to the parent data object for later mutation.
 *
 * Applies all filtering logic:
 * - isTranslatableField
 * - isLocalizedField
 * - strategy.shouldTranslate(sourceValue, targetValue)
 * - !isFieldExcludedFromTranslation
 *
 * IMPORTANT: Expects ORIGINAL collection schemas (before Payload sanitization).
 * Original schemas preserve `localized: true` on nested fields.
 */
export class FieldChunkCollector {
  private chunks: FieldChunk[] = [];

  constructor(
    private readonly schema: Field[],
    private readonly filteredData: Record<string, unknown>,
    private readonly sourceData: Record<string, unknown>,
    private readonly targetData: Record<string, unknown>,
    private readonly strategy: TranslationStrategy
  ) {}

  /**
   * Collects translatable field chunks that need translation.
   */
  collect(): FieldChunk[] {
    this.chunks = [];
    this.traverseFields(
      this.schema,
      this.filteredData,
      this.sourceData,
      this.targetData,
      []
    );
    return this.chunks;
  }

  /**
   * Traverses fields recursively, collecting translatable fields that need translation.
   * Uses strategy.shouldTranslate() to determine if field needs translation.
   */
  private traverseFields(
    fields: Field[],
    data: Record<string, unknown>,
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    path: string[]
  ): void {
    for (const field of fields) {
      if (isTabsField(field)) {
        for (const tab of field.tabs) {
          if (hasFields(tab)) {
            if (tabHasName(tab)) {
              const tabData = data[tab.name];
              const tabSource = source[tab.name];
              const tabTarget = target[tab.name];
              if (isObject(tabData)) {
                this.traverseFields(
                  tab.fields,
                  tabData,
                  isObject(tabSource) ? tabSource : {},
                  isObject(tabTarget) ? tabTarget : {},
                  [...path, tab.name]
                );
              }
            } else {
              this.traverseFields(tab.fields, data, source, target, path);
            }
          }
        }
        continue;
      }

      if (!fieldAffectsData(field)) {
        if (hasFields(field))
          {this.traverseFields(field.fields, data, source, target, path);}
        continue;
      }

      const value = data[field.name];
      const sourceValue = source[field.name];
      const targetValue = target[field.name];
      if (value === undefined || value === null) {continue;}

      const currentPath = [...path, field.name];

      if (fieldIsGroupType(field) && isObject(value)) {
        this.traverseFields(
          field.fields,
          value,
          isObject(sourceValue) ? sourceValue : {},
          isObject(targetValue) ? targetValue : {},
          currentPath
        );
        continue;
      }

      if (fieldIsArrayType(field) && Array.isArray(value)) {
        const sourceArray = Array.isArray(sourceValue) ? sourceValue : [];
        const targetArray = Array.isArray(targetValue) ? targetValue : [];
        value.forEach((item, index) => {
          if (isObject(item)) {
            const sourceItem = isObject(sourceArray[index])
              ? sourceArray[index]
              : {};
            const targetItem = isObject(targetArray[index])
              ? targetArray[index]
              : {};
            this.traverseFields(field.fields, item, sourceItem, targetItem, [
              ...currentPath,
              String(index),
            ]);
          }
        });
        continue;
      }

      if (fieldIsBlockType(field) && Array.isArray(value)) {
        const sourceArray = Array.isArray(sourceValue) ? sourceValue : [];
        const targetArray = Array.isArray(targetValue) ? targetValue : [];
        value.forEach((item, index) => {
          if (isBlockItem(item)) {
            const block = field.blocks.find((b) => b.slug === item.blockType);
            if (block) {
              const sourceItem = isObject(sourceArray[index])
                ? sourceArray[index]
                : {};
              const targetItem = isObject(targetArray[index])
                ? targetArray[index]
                : {};
              this.traverseFields(block.fields, item, sourceItem, targetItem, [
                ...currentPath,
                String(index),
              ]);
            }
          }
        });
        continue;
      }

      // Collect if: translatable, localized, not excluded, and strategy says to translate
      if (
        isTranslatableField(field) &&
        isLocalizedField(field) &&
        !isFieldExcludedFromTranslation(field) &&
        this.strategy.shouldTranslate({ sourceValue, targetValue })
      ) {
        // Write sourceValue to filteredData — this is what will be translated
        data[field.name] = sourceValue;
        this.chunks.push({
          dataRef: data,
          key: field.name,
          path: currentPath,
          schema: field,
        });
      }
    }
  }
}
