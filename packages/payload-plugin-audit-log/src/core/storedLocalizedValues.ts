import type { FieldPathPattern } from "../utils/fields";
import { isRowOf, matchingRowOf } from "./rows";

type Doc = Record<string, unknown>;
type LeafValue = (value: unknown, reference: unknown) => unknown;

const isRecord = (value: unknown): value is Doc =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

function withLeafValueAt(
  value: unknown,
  reference: unknown,
  path: FieldPathPattern,
  leafValue: LeafValue
): unknown {
  const [segment, ...rest] = path;
  if (segment === undefined) return value;
  if (typeof segment !== "string") {
    if (!Array.isArray(value)) return value;
    const referenceRows = Array.isArray(reference) ? reference : [];
    const rows = value.map((row, index) =>
      isRowOf(segment, row)
        ? withLeafValueAt(row, matchingRowOf(row, index, referenceRows), rest, leafValue)
        : row
    );
    return rows.every((row, index) => row === value[index]) ? value : rows;
  }
  if (!(isRecord(value) && segment in value)) return value;
  const referenceValue = isRecord(reference) ? reference[segment] : undefined;
  const replaced =
    rest.length === 0
      ? leafValue(value[segment], referenceValue)
      : withLeafValueAt(value[segment], referenceValue, rest, leafValue);
  return replaced === value[segment] ? value : { ...value, [segment]: replaced };
}

const withLeafValuesAt = (
  doc: Doc,
  reference: unknown,
  paths: readonly FieldPathPattern[],
  leafValue: LeafValue
): Doc =>
  paths.reduce<Doc>(
    (replaced, path) => withLeafValueAt(replaced, reference, path, leafValue) as Doc,
    doc
  );

const storedInLocale = (stored: unknown, locale: string): unknown =>
  isRecord(stored) ? stored[locale] : undefined;

export function withStoredLocalizedValues(
  doc: Doc,
  stored: Doc | null | undefined,
  localizedFields: readonly FieldPathPattern[],
  locale: string
): Doc {
  if (!stored) return doc;
  return withLeafValuesAt(doc, stored, localizedFields, (_shown, storedValue) =>
    storedInLocale(storedValue, locale)
  );
}
