import type { Field } from 'payload'
import { fieldAffectsData, fieldIsArrayType, fieldIsBlockType, fieldIsGroupType, tabHasName } from 'payload/shared'

import { hasFields, isBlockItem, isTabsField, isEmpty, isObject } from '../../../../shared'

/**
 * Deep merges source and target data with target priority.
 * Creates full document shape needed for Payload validation.
 *
 * Logic:
 * - If targetValue exists and is not empty → use targetValue
 * - Otherwise → use sourceValue
 *
 * Stage 1 of the translation pipeline.
 */
export class DataReconciler {
  constructor(private readonly schema: Field[]) {}

  /**
   * Reconciles source and target data into a complete document shape.
   * The result contains all fields needed for Payload validation.
   *
   * @param sourceData - Source locale document data
   * @param targetData - Target locale document data (may be empty/partial)
   * @returns Complete document shape with reconciled field values
   */
  reconcile(sourceData: Record<string, unknown>, targetData: Record<string, unknown>): Record<string, unknown> {
    return this.reconcileFields(this.schema, sourceData, targetData ?? {})
  }

  private reconcileFields(
    fields: Field[],
    source: Record<string, unknown>,
    target: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const field of fields) {
      if (isTabsField(field)) {
        for (const tab of field.tabs) {
          if (hasFields(tab)) {
            if (tabHasName(tab)) {
              const tabSource = source[tab.name]
              const tabTarget = target[tab.name]
              if (isObject(tabSource)) {
                result[tab.name] = this.reconcileFields(tab.fields, tabSource, isObject(tabTarget) ? tabTarget : {})
              }
            } else {
              Object.assign(result, this.reconcileFields(tab.fields, source, target))
            }
          }
        }
        continue
      }

      if (!fieldAffectsData(field)) {
        if (hasFields(field)) Object.assign(result, this.reconcileFields(field.fields, source, target))
        continue
      }

      const sourceValue = source[field.name]
      const targetValue = target[field.name]

      // Skip undefined source values
      if (sourceValue === undefined) continue

      // Group - recursively reconcile
      if (fieldIsGroupType(field) && isObject(sourceValue)) {
        const targetGroup = isObject(targetValue) ? targetValue : {}
        result[field.name] = this.reconcileFields(field.fields, sourceValue, targetGroup)
        continue
      }

      // Array - recursively reconcile each item (without id - Postgres rejects it)
      if (fieldIsArrayType(field) && Array.isArray(sourceValue)) {
        const targetArray = Array.isArray(targetValue) ? targetValue : []
        result[field.name] = sourceValue.map((sourceItem, index) => {
          if (isObject(sourceItem)) {
            const targetItem = isObject(targetArray[index]) ? targetArray[index] : {}
            return this.reconcileFields(field.fields, sourceItem, targetItem)
          }
          return sourceItem
        })
        continue
      }

      // Blocks - recursively reconcile each block (without id - Postgres rejects it)
      if (fieldIsBlockType(field) && Array.isArray(sourceValue)) {
        const targetArray = Array.isArray(targetValue) ? targetValue : []
        result[field.name] = sourceValue.map((sourceItem, index) => {
          if (isBlockItem(sourceItem)) {
            const block = field.blocks.find((b) => b.slug === sourceItem.blockType)
            if (block) {
              const targetItem = isObject(targetArray[index]) ? targetArray[index] : {}
              return {
                ...this.reconcileFields(block.fields, sourceItem, targetItem),
                blockType: sourceItem.blockType,
              }
            }
          }
          return sourceItem
        })
        continue
      }

      // Deep merge: target priority, fallback to source
      result[field.name] = isEmpty(targetValue) ? sourceValue : targetValue
    }

    return result
  }
}
