import type { RowsSegment } from "../utils/fields";

type Doc = Record<string, unknown>;

const isRecord = (value: unknown): value is Doc =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

export const matchingRowOf = (row: unknown, index: number, rows: readonly unknown[]): unknown => {
  const rowId = isRecord(row) ? row.id : undefined;
  if (rowId === undefined || rowId === null) return rows[index];
  return rows.find((candidate) => isRecord(candidate) && candidate.id === rowId);
};

export const isRowOf = (segment: RowsSegment, row: unknown): boolean =>
  segment.blockType === undefined || (isRecord(row) && row.blockType === segment.blockType);
