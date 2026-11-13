import type { ValueExcludePredicate } from "../excludeValues.js";
import type { EditableSchema, HolderField } from "../shared/editableSchema/editableSchema.js";
import type { FieldStep } from "../shared/fieldKey.js";
import type { PlainObject } from "../shared/plainObject.js";
import type { VeDocument } from "../shared/protocol.js";
import type { VeIdentity } from "../shared/shared.js";

import { holderFieldAt } from "../shared/editableSchema/editableSchema.js";
import {
  FIELD_PATH_SEPARATOR,
  fieldKeyOf,
  fieldKeyOfMarker,
  isRowIndex,
  pathOf,
  valueAtPath,
} from "../shared/fieldKey.js";
import { isPlainObject } from "../shared/plainObject.js";
import { rootOf } from "../shared/richText/editorNodes.js";
import { isRichTextNodeKey } from "../shared/richText/nodeKey.js";
import { fieldReferenceOf, META_KEY, veIdentityOf } from "../shared/shared.js";
import { withMarker } from "../shared/stegaText.js";
import { fieldAddressOf, idOf } from "../shared/veDocument.js";
import { markTextLeaves } from "./richText/markTextLeaves.js";

export type ReadOfDocument = {
  identity: VeDocument;
  schema: EditableSchema | null;
  excludeValues?: readonly ValueExcludePredicate[];
  localeCodesKeyingValues?: readonly string[];
  instantPreview?: boolean;
};

type KeyStep = FieldStep | null;

type Place = { segments: readonly string[]; steps: readonly KeyStep[] };

type Holder = Place & { object: PlainObject };

type Holders = Map<PlainObject, Holder>;

type ValueField = Place & { field: HolderField };

type MarkedProperty = { marker: VeIdentity; property: string };

type Marking = {
  root: PlainObject;
  identity: VeDocument;
  schema: EditableSchema;
  excludeValues: readonly ValueExcludePredicate[];
  localeKeys: ReadonlySet<string>;
  keyOf: (steps: readonly KeyStep[]) => string | undefined;
  markRichText: (value: PlainObject, place: Place) => string | undefined;
};

const NO_KEY = () => undefined;

const rowStepOf = (row: unknown): KeyStep => {
  const id = isPlainObject(row) ? idOf(row.id) : null;
  if (id === null) return null;
  const rowId = String(id);
  return rowId === "" || rowId.includes(FIELD_PATH_SEPARATOR) ? null : { rowId };
};

const stableKeyOf = (steps: readonly KeyStep[]): string | undefined => {
  const knownSteps = steps.filter((step): step is FieldStep => step !== null);
  if (knownSteps.length < steps.length) return undefined;
  return knownSteps.some((step) => "rowId" in step) ? fieldKeyOf(knownSteps) : undefined;
};

const hasPrimitiveValue = (object: PlainObject): boolean =>
  Object.values(object).some((value) => typeof value === "string" || typeof value === "number");

const isPayloadRow = (object: PlainObject): boolean => "blockType" in object || "id" in object;

const releaseSingleArrayOfNodes = (object: PlainObject, holders: Holders): void => {
  const isHeld = (element: PlainObject) => holders.has(element) || META_KEY in element;
  let arrayOfNodes: PlainObject[] | null = null;
  let hasOtherContainer = false;

  for (const child of Object.values(object)) {
    if (isPlainObject(child)) {
      hasOtherContainer = true;
      continue;
    }
    if (!Array.isArray(child)) continue;

    const elements = child.filter(isPlainObject);
    if (elements.length === 0) continue;

    if (arrayOfNodes === null && !elements.some(isPayloadRow) && elements.every(isHeld)) {
      arrayOfNodes = elements;
    } else {
      hasOtherContainer = true;
    }
  }

  if (arrayOfNodes === null || hasOtherContainer) return;
  for (const element of arrayOfNodes) {
    holders.delete(element);
    delete element[META_KEY];
  }
};

const copyWithHolders = (value: unknown, place: Place, holders: Holders): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      copyWithHolders(
        item,
        { segments: [...place.segments, String(index)], steps: [...place.steps, rowStepOf(item)] },
        holders
      )
    );
  }
  if (!isPlainObject(value) || META_KEY in value) return value;

  const copy: PlainObject = {};
  for (const key of Object.keys(value)) {
    copy[key] = copyWithHolders(
      value[key],
      { segments: [...place.segments, key], steps: [...place.steps, { name: key }] },
      holders
    );
  }
  if (!hasPrimitiveValue(copy)) return copy;

  releaseSingleArrayOfNodes(copy, holders);
  holders.set(copy, { ...place, object: copy });
  return copy;
};

const withoutIndexes = <Item>(items: readonly Item[], indexes: readonly number[]): Item[] =>
  items.filter((_item, index) => !indexes.includes(index));

const fieldAt = ({ root, schema, localeKeys }: Marking, segments: readonly string[]) =>
  holderFieldAt(schema, root, segments, localeKeys);

const markedPropertiesOf = (
  marking: Marking,
  { object, segments, steps }: Holder,
  field: HolderField
): MarkedProperty[] => {
  const { identity, keyOf, localeKeys } = marking;
  const pathSegments = withoutIndexes(segments, field.localeSegmentIndexes);
  const keySteps = withoutIndexes(steps, field.localeSegmentIndexes);

  if (field.holdsValuePerLocale && field.kind === "text") {
    const marker = { ...identity, key: keyOf(keySteps), path: pathOf(pathSegments) };
    return Object.keys(object)
      .filter((property) => localeKeys.has(property))
      .map((locale) => ({ marker: { ...marker, locale }, property: locale }));
  }

  return field.textFieldNames().map((name) => ({
    marker: {
      ...identity,
      key: keyOf([...keySteps, { name }]),
      locale: field.locale,
      path: pathOf([...pathSegments, name]),
    },
    property: name,
  }));
};

const embedText = (marking: Marking, holder: Holder, field: HolderField): boolean => {
  let isEmbedded = false;
  for (const { marker, property } of markedPropertiesOf(marking, holder, field)) {
    const current = holder.object[property];
    if (typeof current !== "string") continue;
    if (current.trim() === "") continue;
    if (marking.excludeValues.some((match) => match(current))) continue;
    holder.object[property] = withMarker(current, veIdentityOf(marker));
    isEmbedded = true;
  }
  return isEmbedded;
};

const isValueField = (field: HolderField | null): field is HolderField =>
  field?.kind === "richText" || field?.kind === "value";

const nearestValueField = (
  marking: Marking,
  { segments, steps }: Place,
  field: HolderField | null
): ValueField | null => {
  if (isValueField(field)) return { field, segments, steps };
  if (segments.length === 0) return null;

  const above = { segments: segments.slice(0, -1), steps: steps.slice(0, -1) };
  return nearestValueField(marking, above, fieldAt(marking, above.segments));
};

const isValueOfSeveralCollections = (value: PlainObject): boolean =>
  typeof value.relationTo === "string" && isPlainObject(value.value);

const valuesOfField = (value: unknown): PlainObject[] => {
  if (!isPlainObject(value)) return [];
  return isValueOfSeveralCollections(value) ? [value, value.value as PlainObject] : [value];
};

const withoutRowOfManyValues = (segments: readonly string[]): readonly string[] =>
  isRowIndex(segments.at(-1) ?? "") ? segments.slice(0, -1) : segments;

const referenceField = (marking: Marking, { field, ...place }: ValueField): void => {
  const fieldPath = pathOf(
    withoutRowOfManyValues(withoutIndexes(place.segments, field.localeSegmentIndexes))
  );
  for (const value of valuesOfField(valueAtPath(marking.root, place.segments)?.value)) {
    const key = field.kind === "richText" ? marking.markRichText(value, place) : undefined;
    value[META_KEY] = fieldReferenceOf({
      ...marking.identity,
      key,
      locale: field.locale,
      path: fieldPath,
    });
  }
};

const resolveHolder = (marking: Marking, holder: Holder): void => {
  delete holder.object[META_KEY];
  const field = fieldAt(marking, holder.segments);
  if (field !== null && embedText(marking, holder, field)) return;

  const valueField = nearestValueField(marking, holder, field);
  if (valueField) referenceField(marking, valueField);
};

const richTextMarker = (identity: VeDocument) => {
  const keyByValue = new Map<PlainObject, string | undefined>();

  const markLeaves = (value: PlainObject, { segments, steps }: Place): string | undefined => {
    const key = stableKeyOf(steps);
    const fieldKey = fieldKeyOfMarker({ key, path: pathOf(segments) });
    if (fieldKey === null || isRichTextNodeKey(fieldKey)) return undefined;

    markTextLeaves(value, fieldAddressOf(identity, fieldKey));
    return key;
  };

  return (value: PlainObject, place: Place): string | undefined => {
    if (rootOf(value) === null) return undefined;
    if (!keyByValue.has(value)) keyByValue.set(value, markLeaves(value, place));
    return keyByValue.get(value);
  };
};

export const markRead = <Document extends PlainObject>(
  document: Document,
  {
    identity,
    schema,
    excludeValues = [],
    localeCodesKeyingValues = [],
    instantPreview = false,
  }: ReadOfDocument
): Document => {
  const holders: Holders = new Map();
  const root = copyWithHolders(document, { segments: [], steps: [] }, holders) as Document;
  if (schema === null) return root;

  const localeKeys = new Set(localeCodesKeyingValues);
  const marking: Marking = {
    identity,
    excludeValues,
    keyOf: instantPreview ? stableKeyOf : NO_KEY,
    localeKeys,
    markRichText: instantPreview && localeKeys.size === 0 ? richTextMarker(identity) : NO_KEY,
    root,
    schema,
  };
  for (const holder of holders.values()) resolveHolder(marking, holder);
  return root;
};
