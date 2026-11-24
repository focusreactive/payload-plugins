import { TRUNCATED_MARKER } from "../constants";
import type { FieldPathPattern, StoredValuesOf } from "../utils/fields";
import { isRecord } from "../utils/isRecord";
import { localeOfSave } from "../utils/locales";
import type { LocaleOfRequest } from "../utils/locales";
import { ComparedAsWhole, createdPaths, diffPaths, isLexicalRichText } from "./diffPaths";
import { mapAtPaths, matchingRowOf, valueAt } from "./fieldPaths";
import { withStoredLocalizedValues } from "./storedLocalizedValues";

type Doc = Record<string, unknown>;

export type ChangeDiff = {
  savedDoc: (doc: Doc) => Doc;
  createdFields: (doc: Doc) => string[];
  changedFields: (before: Doc | undefined, doc: Doc, written?: Doc) => string[];
};

export type SavedDocScope = {
  storedValuesOf?: StoredValuesOf;
  selected?: boolean;
  submittedData?: Doc;
  savedIn?: LocaleOfRequest;
  configuredLocales?: readonly string[];
  secretFields?: readonly string[];
};

const withinLimit = (paths: readonly string[], maxChangedPaths: number): string[] => {
  const unique = [...new Set(paths.filter((path) => path !== TRUNCATED_MARKER))];
  const truncated = unique.length > maxChangedPaths || paths.includes(TRUNCATED_MARKER);
  return truncated ? [...unique.slice(0, maxChangedPaths), TRUNCATED_MARKER] : unique;
};

const withoutFieldsMissingFromAfter = (
  before: Doc | undefined,
  after: Doc,
  patterns: readonly FieldPathPattern[]
): Doc | undefined =>
  mapAtPaths(before, [after], patterns, (parent, key, [afterParent]) =>
    key in parent && valueAt(afterParent, key) === undefined
      ? Object.fromEntries(Object.entries(parent).filter(([field]) => field !== key))
      : parent
  );

type ComparedValueOf = (before: Doc, after: Doc, saved: Doc, key: string) => unknown;

const restrictedValueToCompare: ComparedValueOf = (before, after, saved, key) =>
  after[key] === undefined && key in before && saved[key] !== undefined ? saved[key] : after[key];

const storedValueMissingFromDoc: ComparedValueOf = (_before, doc, stored, key) =>
  doc[key] === undefined && stored[key] !== undefined ? stored[key] : doc[key];

const withSavedValuesAt = (
  before: Doc | undefined,
  after: Doc,
  saved: Doc,
  patterns: readonly FieldPathPattern[],
  comparedValueOf: ComparedValueOf
): Doc =>
  mapAtPaths(after, [before, saved], patterns, (parent, key, [beforeParent, savedParent]) => {
    const compared = comparedValueOf(
      isRecord(beforeParent) ? beforeParent : {},
      parent,
      isRecord(savedParent) ? savedParent : {},
      key
    );
    return Object.is(compared, parent[key]) ? parent : { ...parent, [key]: compared };
  });

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

const withJsonComparedAsWhole = (
  doc: Doc | undefined,
  jsonFields: readonly FieldPathPattern[]
): Doc | undefined =>
  mapAtPaths(doc, [], jsonFields, (parent, key) =>
    key in parent ? { ...parent, [key]: new ComparedAsWhole(parent[key]) } : parent
  );

export function createChangeDiff({
  readRestrictedFields,
  localizedFields = [],
  jsonFields = [],
  maxChangedPaths,
}: {
  readRestrictedFields: readonly FieldPathPattern[];
  localizedFields?: readonly FieldPathPattern[];
  jsonFields?: readonly FieldPathPattern[];
  maxChangedPaths: number;
}): (scope?: SavedDocScope) => ChangeDiff {
  const localized = localizedFields.length > 0;
  const changedPaths = (before: Doc | undefined, after: Doc): string[] =>
    diffPaths(
      withJsonComparedAsWhole(before, jsonFields),
      withJsonComparedAsWhole(after, jsonFields),
      { max: maxChangedPaths }
    );
  return ({
    storedValuesOf,
    selected = false,
    submittedData = {},
    savedIn = {},
    configuredLocales = [],
    secretFields = [],
  } = {}) => {
    const saveLocale = localeOfSave(savedIn, localized);
    const locales = localized ? configuredLocales : [];
    const stored = (doc: Doc): Doc => (storedValuesOf ? storedValuesOf(doc) : doc);

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

    const changedShownFields = (before: Doc | undefined, doc: Doc): string[] => {
      const pair = comparable(before, doc);
      return changedPaths(pair.before, pair.after);
    };

    const changedStoredFields = (
      storedBefore: Doc | undefined,
      storedAfterSave: Doc,
      doc: Doc
    ): string[] => {
      const inLocale = (value: Doc | undefined, locale: string | undefined) =>
        value && locale !== undefined
          ? withStoredLocalizedValues(value, value, localizedFields, locale)
          : value;
      const comparedLocales = locales.length > 0 ? locales : [undefined];
      return comparedLocales.flatMap((locale) => {
        const pair = comparableStored(
          inLocale(storedBefore, locale),
          inLocale(storedAfterSave, locale) ?? {},
          doc,
          submittedIn(locale)
        );
        return changedPaths(pair.before, pair.after);
      });
    };

    return {
      savedDoc,
      createdFields: (doc) => createdPaths(writtenByCreate(doc)),
      changedFields: (before, doc, written) =>
        withinLimit(
          [
            ...secretFields,
            ...(written
              ? changedStoredFields(before, written, doc)
              : changedShownFields(before, doc)),
          ],
          maxChangedPaths
        ),
    };
  };
}
