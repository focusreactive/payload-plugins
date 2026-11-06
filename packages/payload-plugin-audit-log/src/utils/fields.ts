import type { Block, Field } from "payload";

type FieldShape = {
  name?: string;
  type?: string;
  localized?: boolean;
  virtual?: unknown;
  hidden?: boolean;
  access?: { read?: unknown };
  fields?: Field[];
  tabs?: FieldShape[];
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

const fieldsOf = (fields: readonly Field[] | undefined): readonly FieldShape[] =>
  (fields ?? []) as readonly FieldShape[];

const subfieldsOfUnnamed = (field: FieldShape): readonly FieldShape[] => [
  ...fieldsOf(field.fields),
  ...(field.tabs ?? []),
];

function topLevelFieldNames(
  fields: readonly FieldShape[],
  matches: (field: FieldShape) => boolean,
  names: string[] = []
): string[] {
  for (const f of fields) {
    if (f.name) {
      if (matches(f)) names.push(f.name);
      continue;
    }
    topLevelFieldNames(subfieldsOfUnnamed(f), matches, names);
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

type Doc = Record<string, unknown>;

export type StoredValuesOf = (doc: Doc) => Doc;

const isRecord = (value: unknown): value is Doc =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasNamedSubfields = (field: FlattenedFieldShape): boolean =>
  field.type === "group" || field.type === "tab";

const fieldsByNameOf = (
  fields: readonly FlattenedFieldShape[]
): ReadonlyMap<string, FlattenedFieldShape> => new Map(fields.map((field) => [field.name, field]));

function withStoredValues(
  doc: Doc,
  isStored: (key: string) => boolean,
  fieldsByName: ReadonlyMap<string, FlattenedFieldShape>
): Doc {
  return Object.fromEntries(
    Object.entries(doc)
      .filter(([key]) => isStored(key))
      .map(([key, value]) => {
        const field = fieldsByName.get(key);
        if (!(field?.flattenedFields && hasNamedSubfields(field) && isRecord(value))) {
          return [key, value];
        }
        const subfields = fieldsByNameOf(field.flattenedFields);
        const isStoredSubfield = (subkey: string): boolean => {
          const subfield = subfields.get(subkey);
          return !(subfield && isNotStored(subfield));
        };
        return [key, withStoredValues(value, isStoredSubfield, subfields)];
      })
  );
}

export function storedValuesOf(
  fields: readonly Field[] | undefined
): (sanitized: SanitizedFieldsShape) => StoredValuesOf {
  const notStoredNames: ReadonlySet<string> = new Set(
    topLevelFieldNames(fieldsOf(fields), isNotStored)
  );
  const withoutJoinOrVirtual: StoredValuesOf = (doc) =>
    withStoredValues(doc, (key) => !notStoredNames.has(key), new Map());
  return (sanitized) => {
    if (!sanitized?.flattenedFields) return withoutJoinOrVirtual;
    const names = storedFieldNames(sanitized.flattenedFields);
    const fieldsByName = fieldsByNameOf(sanitized.flattenedFields);
    return (doc) => withStoredValues(doc, (key) => names.has(key), fieldsByName);
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
  fields: readonly FieldShape[],
  sharedBlocks: readonly BlockShape[],
  matches: (field: FieldShape) => boolean,
  prefix: FieldPathPattern,
  paths: FieldPathPattern[]
): FieldPathPattern[] {
  for (const f of fields) {
    if (!f.name) {
      collectFieldPaths(subfieldsOfUnnamed(f), sharedBlocks, matches, prefix, paths);
      continue;
    }
    const path = [...prefix, f.name];
    if (matches(f)) {
      paths.push(path);
    } else if (f.type === "array") {
      collectFieldPaths(
        fieldsOf(f.fields),
        sharedBlocks,
        matches,
        [...path, { rows: true }],
        paths
      );
    } else if (f.type === "blocks") {
      for (const block of blocksOf(f, sharedBlocks)) {
        const rowsOfBlock = { rows: true, blockType: block.slug } as const;
        collectFieldPaths(
          fieldsOf(block.fields),
          sharedBlocks,
          matches,
          [...path, rowsOfBlock],
          paths
        );
      }
    } else {
      collectFieldPaths(fieldsOf(f.fields), sharedBlocks, matches, path, paths);
    }
  }
  return paths;
}

export const readRestrictedFieldPaths = (
  fields: readonly Field[] | undefined,
  sharedBlocks: readonly Block[] = []
): FieldPathPattern[] =>
  collectFieldPaths(fieldsOf(fields), sharedBlocks, isReadRestricted, [], []);

const isLocalized = (f: FieldShape): boolean => f.localized === true;

export const localizedFieldPaths = (
  fields: readonly Field[] | undefined,
  sharedBlocks: readonly Block[] = []
): FieldPathPattern[] => collectFieldPaths(fieldsOf(fields), sharedBlocks, isLocalized, [], []);
