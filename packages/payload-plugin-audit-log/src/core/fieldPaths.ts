import type { FieldPathPattern, RowsSegment } from "../utils/fields";
import { isRecord } from "../utils/isRecord";

type Doc = Record<string, unknown>;

export type AtPathEnd = (parent: Doc, key: string, referenceParents: readonly unknown[]) => Doc;

export const matchingRowOf = (row: unknown, index: number, rows: readonly unknown[]): unknown => {
  const rowId = isRecord(row) ? row.id : undefined;
  if (rowId === undefined || rowId === null) return rows[index];
  return rows.find((candidate) => isRecord(candidate) && candidate.id === rowId);
};

const isRowOf = (segment: RowsSegment, row: unknown): boolean =>
  segment.blockType === undefined || (isRecord(row) && row.blockType === segment.blockType);

export const valueAt = (parent: unknown, key: string): unknown =>
  isRecord(parent) ? parent[key] : undefined;

function mapAtPath(
  value: unknown,
  references: readonly unknown[],
  pattern: FieldPathPattern,
  atPathEnd: AtPathEnd
): unknown {
  const [segment, ...rest] = pattern;
  if (segment === undefined) return value;
  if (typeof segment !== "string") {
    if (!Array.isArray(value)) return value;
    const referenceRows = references.map((reference) =>
      Array.isArray(reference) ? reference : []
    );
    const rows = value.map((row, index) =>
      isRowOf(segment, row)
        ? mapAtPath(
            row,
            referenceRows.map((candidates) => matchingRowOf(row, index, candidates)),
            rest,
            atPathEnd
          )
        : row
    );
    return rows.every((row, index) => row === value[index]) ? value : rows;
  }
  if (!isRecord(value)) return value;
  if (rest.length === 0) return atPathEnd(value, segment, references);
  const mapped = mapAtPath(
    value[segment],
    references.map((reference) => valueAt(reference, segment)),
    rest,
    atPathEnd
  );
  return mapped === value[segment] ? value : { ...value, [segment]: mapped };
}

export const mapAtPaths = <V extends Doc | undefined>(
  value: V,
  references: readonly unknown[],
  patterns: readonly FieldPathPattern[],
  atPathEnd: AtPathEnd
): V =>
  patterns.reduce<unknown>(
    (mapped, pattern) => mapAtPath(mapped, references, pattern, atPathEnd),
    value
  ) as V;
