import type { Block, Field } from "payload";

type FieldShape = {
  name?: string;
  type?: string;
  localized?: boolean;
  virtual?: unknown;
  hidden?: boolean;
  access?: { read?: unknown };
  fields?: Field[];
  tabs?: { name?: string; fields?: Field[] }[];
  blocks?: BlockShape[];
  blockReferences?: (BlockShape | string)[];
};

type BlockShape = { slug: string; fields?: Field[] };

export type FlattenedFieldShape = {
  name: string;
  type: string;
  virtual?: unknown;
  localized?: boolean;
  flattenedFields?: readonly FlattenedFieldShape[];
};
export type SanitizedFieldsShape = { flattenedFields?: readonly FlattenedFieldShape[] } | undefined;

export type RowsSegment = { rows: true; blockType?: string };
export type FieldPathSegment = string | RowsSegment;
export type FieldPathPattern = readonly FieldPathSegment[];

export function hasLocalizedFields(fields: readonly Field[] | undefined): boolean {
  return (fields ?? []).some((field) => {
    const f = field as FieldShape;
    return (
      Boolean(f.localized) ||
      hasLocalizedFields(f.fields) ||
      Boolean(f.tabs?.some((tab) => hasLocalizedFields(tab.fields))) ||
      Boolean(f.blocks?.some((block) => hasLocalizedFields(block.fields)))
    );
  });
}

function topLevelFieldNames(
  fields: readonly Field[] | undefined,
  matches: (field: FieldShape) => boolean,
  names: string[] = []
): string[] {
  for (const field of fields ?? []) {
    const f = field as FieldShape;
    if (f.name) {
      if (matches(f)) names.push(f.name);
      continue;
    }
    topLevelFieldNames(f.fields, matches, names);
    for (const tab of f.tabs ?? []) {
      if (!tab.name) topLevelFieldNames(tab.fields, matches, names);
    }
  }
  return names;
}

const isNotStored = (field: { type?: string; virtual?: unknown }): boolean =>
  field.type === "join" || Boolean(field.virtual);

const NO_STORED_FIELD_NAMES: ReadonlySet<string> = new Set();

const storedFieldNamesByFields = new WeakMap<readonly FlattenedFieldShape[], ReadonlySet<string>>();

export function storedFieldNames(
  flattenedFields: readonly FlattenedFieldShape[] | undefined
): ReadonlySet<string> {
  if (!flattenedFields) return NO_STORED_FIELD_NAMES;
  const cached = storedFieldNamesByFields.get(flattenedFields);
  if (cached) return cached;
  const names: ReadonlySet<string> = new Set(
    flattenedFields.filter((field) => !isNotStored(field)).map((field) => field.name)
  );
  storedFieldNamesByFields.set(flattenedFields, names);
  return names;
}

export type IsStoredField = (key: string) => boolean;

export function storedFieldCheckOf(
  fields: readonly Field[] | undefined
): (sanitized: SanitizedFieldsShape) => IsStoredField {
  const notStoredNames: ReadonlySet<string> = new Set(topLevelFieldNames(fields, isNotStored));
  const isNotJoinOrVirtual: IsStoredField = (key) => !notStoredNames.has(key);
  return (sanitized) => {
    if (!sanitized?.flattenedFields) return isNotJoinOrVirtual;
    const names = storedFieldNames(sanitized.flattenedFields);
    return (key) => names.has(key);
  };
}

const isReadRestricted = (f: FieldShape): boolean => f.hidden === true || Boolean(f.access?.read);

function blocksOf(field: FieldShape, sharedBlocks: readonly BlockShape[]): BlockShape[] {
  const references = (field.blockReferences ?? []).map((reference) =>
    typeof reference === "string"
      ? sharedBlocks.find((block) => block.slug === reference)
      : reference
  );
  const resolved = references.filter((block): block is BlockShape => block !== undefined);
  return [...(field.blocks ?? []), ...resolved];
}

function collectFieldPaths(
  fields: readonly Field[] | undefined,
  sharedBlocks: readonly BlockShape[],
  matches: (field: FieldShape) => boolean,
  prefix: FieldPathPattern,
  paths: FieldPathPattern[]
): FieldPathPattern[] {
  for (const field of fields ?? []) {
    const f = field as FieldShape;
    if (!f.name) {
      collectFieldPaths(f.fields, sharedBlocks, matches, prefix, paths);
      for (const tab of f.tabs ?? []) {
        const tabPrefix = tab.name ? [...prefix, tab.name] : prefix;
        collectFieldPaths(tab.fields, sharedBlocks, matches, tabPrefix, paths);
      }
      continue;
    }
    const path = [...prefix, f.name];
    if (matches(f)) {
      paths.push(path);
    } else if (f.type === "array") {
      collectFieldPaths(f.fields, sharedBlocks, matches, [...path, { rows: true }], paths);
    } else if (f.type === "blocks") {
      for (const block of blocksOf(f, sharedBlocks)) {
        const rowsOfBlock = { rows: true, blockType: block.slug } as const;
        collectFieldPaths(block.fields, sharedBlocks, matches, [...path, rowsOfBlock], paths);
      }
    } else {
      collectFieldPaths(f.fields, sharedBlocks, matches, path, paths);
    }
  }
  return paths;
}

export const readRestrictedFieldPaths = (
  fields: readonly Field[] | undefined,
  sharedBlocks: readonly Block[] = []
): FieldPathPattern[] => collectFieldPaths(fields, sharedBlocks, isReadRestricted, [], []);

const isLocalized = (f: FieldShape): boolean => f.localized === true;

export const localizedFieldPaths = (
  fields: readonly Field[] | undefined,
  sharedBlocks: readonly Block[] = []
): FieldPathPattern[] => collectFieldPaths(fields, sharedBlocks, isLocalized, [], []);
