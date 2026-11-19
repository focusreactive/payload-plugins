import type { FormState } from "payload";

import type { RowChain, RowLevel } from "./resolveRowChain.js";

export type RowState = { id?: string; blockType?: string; collapsed?: boolean };

export type OpenRows = {
  readonly deepestRowPath: string;
  readonly rowIdsAtOpen: readonly string[];
};

const ROW_PATH = /\.\d+$/u;

export const rowsOf = (fields: FormState, fieldPath: string): RowState[] | undefined =>
  fields[fieldPath]?.rows as RowState[] | undefined;

export const rowCountOf = (fields: FormState, fieldPath: string): number | undefined =>
  rowsOf(fields, fieldPath)?.length;

export const blockTypeOf = (
  fields: FormState,
  { fieldPath, rowIndex, rowPath }: { fieldPath: string; rowIndex: number; rowPath: string }
): string | undefined => {
  const fromRows = rowsOf(fields, fieldPath)?.[rowIndex]?.blockType;
  const fromField = fields[`${rowPath}.blockType`]?.value;
  return fromRows ?? (typeof fromField === "string" ? fromField : undefined);
};

export const withRowCollapsed = (rows: RowState[], rowId: string): RowState[] =>
  rows.map((row) => (row.id === rowId ? { ...row, collapsed: true } : row));

const pathPrefixes = (path: string): string[] => {
  const segments = path.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
};

const directTextValues = (fields: FormState, rowPath: string): string[] => {
  const childPrefix = `${rowPath}.`;
  const values: string[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const { value } = field as { value?: unknown };
    const isDirectChild =
      path.startsWith(childPrefix) && !path.slice(childPrefix.length).includes(".");
    if (isDirectChild && (typeof value === "string" || typeof value === "number")) {
      values.push(`${path}=${value}`);
    }
  }
  return values;
};

export const openRowsSignature = (
  fields: FormState,
  deepestRowPath: string | undefined
): string => {
  if (!deepestRowPath) {
    return "";
  }
  const parts: string[] = [];
  for (const prefix of pathPrefixes(deepestRowPath)) {
    const rows = rowsOf(fields, prefix);
    if (rows) {
      parts.push(`${prefix}=${rows.map((row) => `${row.id}:${row.blockType ?? ""}`).join(",")}`);
    }
    if (ROW_PATH.test(prefix)) {
      parts.push(...directTextValues(fields, prefix));
    }
  }
  return parts.join("|");
};

export const levelsWithUnchangedRows = (
  chain: RowChain,
  open: OpenRows,
  fields: FormState
): RowLevel[] => {
  const levels: RowLevel[] = [];
  for (const [index, level] of chain.levels.entries()) {
    const id = rowsOf(fields, level.fieldPath)?.[level.rowIndex]?.id;
    if (id === undefined || id !== open.rowIdsAtOpen[index]) {
      break;
    }
    levels.push(level);
  }
  return levels;
};

export const keepFirstLevels = (
  levels: readonly RowLevel[],
  open: OpenRows,
  keep: number
): OpenRows | null => {
  const last = levels[keep - 1];
  return last
    ? { deepestRowPath: last.rowPath, rowIdsAtOpen: open.rowIdsAtOpen.slice(0, keep) }
    : null;
};
