import { FIELD_PATH_SEPARATOR, isRowIndex, pathOf } from "../shared/fieldKey.js";
import { fieldDomIdOf, rowContainerIdOf } from "./fieldDomId.js";

export const parseFieldPath = (
  fieldPath: string
): {
  rowIds: string[];
  fieldId: string | null;
} => {
  const parts = fieldPath.split(FIELD_PATH_SEPARATOR);
  const rowIds = parts.flatMap((part, index) =>
    isRowIndex(part) ? [rowContainerIdOf(pathOf(parts.slice(0, index)), part)] : []
  );
  const fieldId = isRowIndex(parts.at(-1) ?? "") ? null : fieldDomIdOf(fieldPath);

  return { rowIds, fieldId };
};
