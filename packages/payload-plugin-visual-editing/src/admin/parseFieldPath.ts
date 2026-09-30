// Payload's form DOM conventions:
//   - Each array/block row container has id `<arrayName>-row-<index>` at top level,
//     and `<arrayName>-<index>-<subName>-row-<subIndex>` for nested array rows.
//   - Each leaf field wrapper has id `field-<path-with-__-separator>`.
// A stega path ending in a numeric segment targets a block/row itself, not a
// specific leaf field — so `fieldId` is null in that case.
export const parseFieldPath = (
  fieldPath: string
): {
  rowIds: string[];
  fieldId: string | null;
} => {
  const parts = fieldPath.split(".");
  const rowIds: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (!Number.isNaN(Number.parseInt(parts[i]!, 10))) {
      const prefix = parts.slice(0, i).join("-");
      rowIds.push(`${prefix}-row-${parts[i]}`);
    }
  }

  const lastPart = parts[parts.length - 1]!;
  const endsWithIndex = !Number.isNaN(Number.parseInt(lastPart, 10));
  const fieldId = endsWithIndex ? null : `field-${fieldPath.replace(/\./g, "__")}`;

  return { rowIds, fieldId };
};
