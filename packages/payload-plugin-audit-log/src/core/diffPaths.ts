import { DEFAULT_MAX_CHANGED_PATHS, IGNORED_DIFF_KEYS, TRUNCATED_MARKER } from "../constants";
import { isId } from "../utils/isId";

type DocObject = Record<string, unknown>;

const MAX_DIFF_DEPTH = 8;
const ROW_ID_KEY = "id";

export class ComparedAsWhole {
  readonly value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

const unwrapped = (value: unknown): unknown =>
  value instanceof ComparedAsWhole ? value.value : value;

const isContainer = (value: unknown): value is DocObject | unknown[] =>
  typeof value === "object" && value !== null && !(value instanceof Date);

const isObject = (value: unknown): value is DocObject =>
  isContainer(value) && !Array.isArray(value);

const isPopulatedRelationOf = (id: unknown, populated: unknown): boolean =>
  isId(id) && isObject(populated) && populated.id === id;

const isSameRelation = (a: unknown, b: unknown): boolean =>
  isPopulatedRelationOf(a, b) || isPopulatedRelationOf(b, a);

const isRowWithId = (value: unknown): value is DocObject => isObject(value) && isId(value.id);

const areRowsWithIds = (a: unknown, b: unknown): a is DocObject[] =>
  Array.isArray(a) && Array.isArray(b) && [...a, ...b].every(isRowWithId);

const childPath = (path: string, key: string | number): string =>
  path ? `${path}.${key}` : String(key);

const isOutOfOrder = (indexes: readonly number[]): boolean =>
  indexes.some((index, position) => position > 0 && index < (indexes[position - 1] ?? index));

function isEquivalent(a: unknown, b: unknown): boolean {
  if (Object.is(a, b) || isSameRelation(a, b)) return true;
  if (!(isContainer(a) && isContainer(b)) || Array.isArray(a) !== Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  const aObject = a as DocObject;
  const bObject = b as DocObject;
  const keys = new Set([...Object.keys(aObject), ...Object.keys(bObject)]);
  return [...keys].every((key) => isEquivalent(aObject[key], bObject[key]));
}

export const isLexicalRichText = (value: unknown): boolean =>
  isObject(value) && isObject(value.root) && value.root.type === "root";

function rowsPairedById(rowsBefore: readonly DocObject[], rowsAfter: readonly DocObject[]) {
  const beforeIndexById = new Map(rowsBefore.map((row, index) => [row.id, index]));
  const beforeIndexes = rowsAfter
    .map((row) => beforeIndexById.get(row.id))
    .filter((index): index is number => index !== undefined);
  const removesRows = new Set(beforeIndexes).size < rowsBefore.length;
  const pairs = rowsAfter.map((rowAfter, index) => {
    const beforeIndex = beforeIndexById.get(rowAfter.id);
    const rowBefore = beforeIndex === undefined ? undefined : rowsBefore[beforeIndex];
    return { rowBefore, rowAfter, index };
  });
  return { reshaped: removesRows || isOutOfOrder(beforeIndexes), pairs };
}

function hasLeafValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object" || value instanceof Date) return true;
  return Object.values(value).some(hasLeafValue);
}

export function diffPaths(
  before: unknown,
  after: unknown,
  opts: { max?: number; ignore?: ReadonlySet<string> } = {}
): string[] {
  const max = opts.max ?? DEFAULT_MAX_CHANGED_PATHS;
  const ignore = opts.ignore ?? IGNORED_DIFF_KEYS;
  const paths: string[] = [];
  let truncated = false;

  const addPath = (path: string): void => {
    if (paths.length < max) paths.push(path);
    else truncated = true;
  };

  const isIgnoredKey = (key: string, depth: number, isRow: boolean): boolean =>
    (depth === 0 && ignore.has(key)) || (isRow && key === ROW_ID_KEY);

  const walk = (a: unknown, b: unknown, path: string, depth: number, isRow = false): void => {
    if (truncated || Object.is(a, b) || isSameRelation(a, b)) return;
    const bothSameContainerKind =
      isContainer(a) && isContainer(b) && Array.isArray(a) === Array.isArray(b);
    const comparedAsWhole =
      a instanceof ComparedAsWhole ||
      b instanceof ComparedAsWhole ||
      !bothSameContainerKind ||
      depth >= MAX_DIFF_DEPTH ||
      isLexicalRichText(a) ||
      isLexicalRichText(b);
    if (comparedAsWhole) {
      const aValue = unwrapped(a);
      const bValue = unwrapped(b);
      if (!(hasLeafValue(aValue) || hasLeafValue(bValue))) return;
      if (path && !isEquivalent(aValue, bValue)) addPath(path);
      return;
    }
    if (areRowsWithIds(a, b)) {
      const { reshaped, pairs } = rowsPairedById(a, b as DocObject[]);
      if (path && reshaped) addPath(path);
      for (const { rowBefore, rowAfter, index } of pairs) {
        walk(rowBefore, rowAfter, childPath(path, index), depth + 1, true);
      }
      return;
    }
    const aObject = a as DocObject;
    const bObject = b as DocObject;
    const childrenAreRows = Array.isArray(a);
    const keys = new Set([...Object.keys(aObject), ...Object.keys(bObject)]);
    for (const key of keys) {
      if (isIgnoredKey(key, depth, isRow)) continue;
      walk(aObject[key], bObject[key], childPath(path, key), depth + 1, childrenAreRows);
    }
  };

  walk(before ?? {}, after ?? {}, "", 0);
  if (truncated) paths.push(TRUNCATED_MARKER);
  return paths;
}

export function createdPaths(
  doc: DocObject,
  ignore: ReadonlySet<string> = IGNORED_DIFF_KEYS
): string[] {
  return Object.keys(doc).filter((key) => !ignore.has(key) && hasLeafValue(doc[key]));
}
