import type { PayloadRequest } from "payload";
import { TRUNCATED_MARKER } from "../constants";
import type { FieldPathPattern, IsStoredField } from "../utils/fields";
import { createdPaths, diffPaths, isLexicalRichText } from "./diffPaths";
import { isRowOf, matchingRowOf } from "./rows";
import { withStoredLocalizedValues } from "./storedLocalizedValues";

type Doc = Record<string, unknown>;

export type ChangeDiff = {
  savedDoc: (doc: Doc) => Doc;
  createdFields: (doc: Doc) => string[];
  changedFields: (before: Doc | undefined, after: Doc) => string[];
  comparable: (before: Doc | undefined, after: Doc) => { before: Doc | undefined; after: Doc };
  changedStoredFields: (
    storedBefore: Doc | undefined,
    storedAfter: Doc,
    doc: Doc,
    locales: readonly string[]
  ) => string[];
};

export type SavedDocScope = {
  isStoredField?: IsStoredField;
  selected?: boolean;
  submittedData?: Doc;
  saveLocale?: string;
};

const withinLimit = (paths: readonly string[], maxChangedPaths: number): string[] => {
  const unique = [...new Set(paths.filter((path) => path !== TRUNCATED_MARKER))];
  const truncated = unique.length > maxChangedPaths || paths.includes(TRUNCATED_MARKER);
  return truncated ? [...unique.slice(0, maxChangedPaths), TRUNCATED_MARKER] : unique;
};

const isRecord = (value: unknown): value is Doc =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

function withoutFieldMissingFromAfter(
  before: unknown,
  after: unknown,
  pattern: FieldPathPattern
): unknown {
  const [segment, ...rest] = pattern;
  if (segment === undefined) return before;
  if (typeof segment !== "string") {
    if (!Array.isArray(before)) return before;
    const afterRows = Array.isArray(after) ? after : [];
    const rows = before.map((row, index) =>
      isRowOf(segment, row)
        ? withoutFieldMissingFromAfter(row, matchingRowOf(row, index, afterRows), rest)
        : row
    );
    return rows.every((row, index) => row === before[index]) ? before : rows;
  }
  if (!(isRecord(before) && segment in before)) return before;
  const afterValue = isRecord(after) ? after[segment] : undefined;
  if (rest.length === 0) {
    if (afterValue !== undefined) return before;
    return Object.fromEntries(Object.entries(before).filter(([key]) => key !== segment));
  }
  const stripped = withoutFieldMissingFromAfter(before[segment], afterValue, rest);
  return stripped === before[segment] ? before : { ...before, [segment]: stripped };
}

export const withoutFieldsMissingFromAfter = (
  before: Doc | undefined,
  after: Doc,
  patterns: readonly FieldPathPattern[]
): Doc | undefined =>
  patterns.reduce<Doc | undefined>(
    (readable, pattern) =>
      withoutFieldMissingFromAfter(readable, after, pattern) as Doc | undefined,
    before
  );

type ComparedValueOf = (before: Doc, after: Doc, saved: Doc, key: string) => unknown;

const restrictedValueToCompare: ComparedValueOf = (before, after, saved, key) =>
  after[key] === undefined && key in before && saved[key] !== undefined ? saved[key] : after[key];

function withSavedValueAt(
  before: unknown,
  after: unknown,
  saved: unknown,
  pattern: FieldPathPattern,
  comparedValueOf: ComparedValueOf
): unknown {
  const [segment, ...rest] = pattern;
  if (segment === undefined) return after;
  if (typeof segment !== "string") {
    if (!Array.isArray(after)) return after;
    const beforeRows = Array.isArray(before) ? before : [];
    const savedRows = Array.isArray(saved) ? saved : [];
    const rows = after.map((row, index) =>
      isRowOf(segment, row)
        ? withSavedValueAt(
            matchingRowOf(row, index, beforeRows),
            row,
            matchingRowOf(row, index, savedRows),
            rest,
            comparedValueOf
          )
        : row
    );
    return rows.every((row, index) => row === after[index]) ? after : rows;
  }
  if (!isRecord(after)) return after;
  const comparedBefore = isRecord(before) ? before : {};
  const comparedSaved = isRecord(saved) ? saved : {};
  if (rest.length === 0) {
    const compared = comparedValueOf(comparedBefore, after, comparedSaved, segment);
    return Object.is(compared, after[segment]) ? after : { ...after, [segment]: compared };
  }
  const withSaved = withSavedValueAt(
    comparedBefore[segment],
    after[segment],
    comparedSaved[segment],
    rest,
    comparedValueOf
  );
  return withSaved === after[segment] ? after : { ...after, [segment]: withSaved };
}

const storedValueMissingFromDoc: ComparedValueOf = (_before, doc, stored, key) =>
  doc[key] === undefined && stored[key] !== undefined ? stored[key] : doc[key];

const withSavedValuesAt = (
  before: Doc | undefined,
  after: Doc,
  saved: Doc,
  patterns: readonly FieldPathPattern[],
  comparedValueOf: ComparedValueOf
): Doc =>
  patterns.reduce<Doc>(
    (comparable, pattern) =>
      withSavedValueAt(before, comparable, saved, pattern, comparedValueOf) as Doc,
    after
  );

export const withStoredValuesOfFieldsMissingFrom = (
  doc: Doc,
  stored: Doc,
  patterns: readonly FieldPathPattern[]
): Doc => withSavedValuesAt(undefined, doc, stored, patterns, storedValueMissingFromDoc);

function withOnlyValuesSelectedIn(before: unknown, after: unknown): unknown {
  if (isLexicalRichText(before) || isLexicalRichText(after)) return before;
  if (Array.isArray(before) && Array.isArray(after)) {
    return before.map((row, index) => {
      const afterRow = matchingRowOf(row, index, after);
      return afterRow === undefined ? row : withOnlyValuesSelectedIn(row, afterRow);
    });
  }
  if (!(isRecord(before) && isRecord(after))) return before;
  return Object.fromEntries(
    Object.entries(before)
      .filter(([key]) => after[key] !== undefined)
      .map(([key, value]) => [key, withOnlyValuesSelectedIn(value, after[key])])
  );
}

function withSelectedOverSubmitted(submitted: unknown, selected: unknown): unknown {
  if (selected === undefined) return submitted;
  if (isLexicalRichText(selected) || isLexicalRichText(submitted)) return selected;
  if (Array.isArray(selected) && Array.isArray(submitted)) {
    return selected.map((row, index) =>
      withSelectedOverSubmitted(matchingRowOf(row, index, submitted), row)
    );
  }
  if (!(isRecord(selected) && isRecord(submitted))) return selected;
  const keys = new Set([...Object.keys(submitted), ...Object.keys(selected)]);
  return Object.fromEntries(
    [...keys]
      .map((key) => [key, withSelectedOverSubmitted(submitted[key], selected[key])] as const)
      .filter(([, value]) => value !== undefined)
  );
}

const withOnlyStoredFields = (doc: Doc, isStoredField: IsStoredField | undefined): Doc =>
  isStoredField
    ? Object.fromEntries(Object.entries(doc).filter(([key]) => isStoredField(key)))
    : doc;

export function createChangeDiff({
  readRestrictedFields,
  localizedFields = [],
  maxChangedPaths,
}: {
  readRestrictedFields: readonly FieldPathPattern[];
  localizedFields?: readonly FieldPathPattern[];
  maxChangedPaths: number;
}): (scope?: SavedDocScope) => ChangeDiff {
  return ({ isStoredField, selected = false, submittedData = {}, saveLocale } = {}) => {
    const stored = (doc: Doc): Doc => withOnlyStoredFields(doc, isStoredField);

    const readableSubmittedData = (doc: Doc) =>
      withoutFieldsMissingFromAfter(submittedData, doc, readRestrictedFields) ?? {};

    const savedDoc = (doc: Doc): Doc =>
      selected ? stored(withSelectedOverSubmitted(readableSubmittedData(doc), doc) as Doc) : doc;

    const storedAfter = (doc: Doc): Doc => stored(savedDoc(doc));

    const writtenByCreate = (doc: Doc): Doc =>
      stored(
        withStoredValuesOfFieldsMissingFrom(savedDoc(doc), submittedData, readRestrictedFields)
      );

    const comparable = (before: Doc | undefined, doc: Doc) => {
      const storedBefore = before && stored(before);
      const after = withSavedValuesAt(
        storedBefore,
        storedAfter(doc),
        submittedData,
        readRestrictedFields,
        restrictedValueToCompare
      );
      const readable = withoutFieldsMissingFromAfter(storedBefore, after, readRestrictedFields);
      return {
        before: selected
          ? (withOnlyValuesSelectedIn(readable, after) as Doc | undefined)
          : readable,
        after,
      };
    };

    const submittedIn = (locale: string | undefined): Doc =>
      saveLocale === undefined || locale === undefined || locale === saveLocale
        ? submittedData
        : {};

    const comparableStored = (before: Doc | undefined, after: Doc, doc: Doc, submitted: Doc) => {
      const storedBefore = before && stored(before);
      const readableAfter = withoutFieldsMissingFromAfter(stored(after), doc, readRestrictedFields);
      const comparedAfter = withSavedValuesAt(
        storedBefore,
        readableAfter ?? {},
        submitted,
        readRestrictedFields,
        restrictedValueToCompare
      );
      return {
        before: withoutFieldsMissingFromAfter(storedBefore, comparedAfter, readRestrictedFields),
        after: comparedAfter,
      };
    };

    const changedStoredFields = (
      storedBefore: Doc | undefined,
      storedAfterSave: Doc,
      doc: Doc,
      locales: readonly string[]
    ): string[] => {
      const inLocale = (value: Doc | undefined, locale: string | undefined) =>
        value && locale !== undefined
          ? withStoredLocalizedValues(value, value, localizedFields, locale)
          : value;
      const comparedLocales = locales.length > 0 ? locales : [undefined];
      const paths = comparedLocales.flatMap((locale) => {
        const pair = comparableStored(
          inLocale(storedBefore, locale),
          inLocale(storedAfterSave, locale) ?? {},
          doc,
          submittedIn(locale)
        );
        return diffPaths(pair.before, pair.after, { max: maxChangedPaths });
      });
      return withinLimit(paths, maxChangedPaths);
    };

    return {
      savedDoc,
      changedStoredFields,
      createdFields: (doc) => createdPaths(writtenByCreate(doc)),
      changedFields: (before, doc) => {
        const pair = comparable(before, doc);
        return diffPaths(pair.before, pair.after, { max: maxChangedPaths });
      },
      comparable,
    };
  };
}

type LocalizationShape = { localization?: false | { localeCodes?: readonly string[] } };

export const configuredLocalesOf = (req: PayloadRequest): readonly string[] => {
  const localization = (req.payload.config as LocalizationShape | undefined)?.localization;
  return localization ? (localization.localeCodes ?? []) : [];
};
