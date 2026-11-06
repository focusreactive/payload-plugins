import { DEFAULT_MAX_CHANGED_PATHS, IGNORED_DIFF_KEYS, TRUNCATED_MARKER } from "../constants";
import { isId } from "../utils/isId";

type DocObject = Record<string, unknown>;

const MAX_DIFF_DEPTH = 8;
const ROW_ID_KEY = "id";

const isContainer = (value: unknown): value is DocObject | unknown[] =>
  typeof value === "object" && value !== null && !(value instanceof Date);

const isObject = (value: unknown): value is DocObject =>
  isContainer(value) && !Array.isArray(value);

const isPopulatedRelationOf = (id: unknown, populated: unknown): boolean =>
  isId(id) && isObject(populated) && populated.id === id;

const isSameRelation = (a: unknown, b: unknown): boolean =>
  isPopulatedRelationOf(a, b) || isPopulatedRelationOf(b, a);

export const isLexicalRichText = (value: unknown): boolean =>
  isObject(value) && isObject(value.root) && value.root.type === "root";

export function hasLeafValue(value: unknown): boolean {
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
      !bothSameContainerKind ||
      depth >= MAX_DIFF_DEPTH ||
      isLexicalRichText(a) ||
      isLexicalRichText(b);
    if (comparedAsWhole) {
      if (!(hasLeafValue(a) || hasLeafValue(b))) return;
      if (path && JSON.stringify(a) !== JSON.stringify(b)) addPath(path);
      return;
    }
    const aObject = a as DocObject;
    const bObject = b as DocObject;
    const childrenAreRows = Array.isArray(a);
    const keys = new Set([...Object.keys(aObject), ...Object.keys(bObject)]);
    for (const key of keys) {
      if (isIgnoredKey(key, depth, isRow)) continue;
      walk(aObject[key], bObject[key], path ? `${path}.${key}` : key, depth + 1, childrenAreRows);
    }
  };

  walk(before ?? {}, after ?? {}, "", 0);
  if (truncated) paths.push(TRUNCATED_MARKER);
  return paths;
}

const NOTHING_IGNORED: ReadonlySet<string> = new Set();

export const valuesDiffer = (before: unknown, after: unknown): boolean =>
  diffPaths({ value: before }, { value: after }, { max: 1, ignore: NOTHING_IGNORED }).length > 0;

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || (isContainer(value) && Object.keys(value).length === 0);

export function withoutEmptyValues(value: unknown): unknown {
  if (!isContainer(value)) return value;
  if (Array.isArray(value)) return value.map(withoutEmptyValues);
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, child]) => [key, withoutEmptyValues(child)] as const)
      .filter(([, child]) => !isEmptyValue(child))
  );
}

export function createdPaths(
  doc: DocObject,
  ignore: ReadonlySet<string> = IGNORED_DIFF_KEYS
): string[] {
  return Object.keys(doc).filter((key) => !ignore.has(key) && hasLeafValue(doc[key]));
}
