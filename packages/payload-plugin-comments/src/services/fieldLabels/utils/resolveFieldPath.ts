import type { ArrayField, BlocksField, CollapsibleField, Field, GroupField, RowField, TabsField } from "payload";
import type { FieldLabelSegment } from "../../../types";
import { findFieldByName, getLabelString } from "./schemaUtils";

export function resolveFieldPath(
  segments: string[],
  schemaFields: Field[],
  docData: Record<string, unknown> | null,
): FieldLabelSegment[] {
  const result: FieldLabelSegment[] = [];
  let currentFields: Field[] = schemaFields;
  let currentData: unknown = docData;
  let awaitingRowForField: (ArrayField | BlocksField) | null = null;

  for (const segment of segments) {
    if (awaitingRowForField) {
      const rowId = segment;
      let position = 0;
      const parentData = currentData as Record<string, unknown> | null;
      const fieldName = (awaitingRowForField as { name: string }).name;
      const arrayData = parentData?.[fieldName];

      if (Array.isArray(arrayData)) {
        const idx = arrayData.findIndex((item: unknown) => String((item as { id?: unknown }).id) === rowId);
        if (idx >= 0) {
          position = idx;
          const rowItem = arrayData[idx] as Record<string, unknown>;
          currentData = rowItem;

          if (awaitingRowForField.type === "blocks") {
            const blockType = rowItem["blockType"] as string | undefined;
            if (blockType) {
              const blockConfig = (awaitingRowForField as BlocksField).blocks.find((b) => b.slug === blockType);
              currentFields = blockConfig?.fields ?? [];
            } else {
              currentFields = [];
            }
          } else {
            currentFields = (awaitingRowForField as ArrayField).fields;
          }
        }
      }

      result.push({ type: "row", id: rowId, position });
      awaitingRowForField = null;
    } else {
      const field = findFieldByName(currentFields, segment);
      if (!field) {
        result.push({ type: "field", label: segment });
        currentFields = [];
        continue;
      }

      result.push({ type: "field", label: getLabelString(field) });

      if (field.type === "array") {
        awaitingRowForField = field as ArrayField;
      } else if (field.type === "blocks") {
        awaitingRowForField = field as BlocksField;
      } else if (field.type === "group") {
        currentFields = (field as GroupField).fields;
        if (currentData && typeof currentData === "object") {
          currentData = (currentData as Record<string, unknown>)[segment];
        }
      } else if (field.type === "tabs") {
        currentFields = (field as TabsField).tabs.flatMap((t) => t.fields ?? []);
      } else if (field.type === "collapsible" || field.type === "row") {
        currentFields = (field as CollapsibleField | RowField).fields;
      } else {
        currentFields = [];
      }
    }
  }

  return result;
}
