import { rowWithId } from "./rowWithId.js";
import { isPlainObject } from "./plainObject.js";

export const FIELD_PATH_SEPARATOR = ".";

export type FieldStep = { name: string } | { rowId: string; blockType?: string };

type Found = { value: unknown } | null;

type MarkerAddress = { key?: string; path: string };

const ROW_INDEX = /^\d+$/u;

export const fieldKeyOf = (steps: readonly FieldStep[]): string =>
  steps.map((step) => ("rowId" in step ? step.rowId : step.name)).join(FIELD_PATH_SEPARATOR);

export const isRowIndex = (segment: string): boolean => ROW_INDEX.test(segment);

export const pathOf = (segments: readonly string[]): string => segments.join(FIELD_PATH_SEPARATOR);

export const joinFieldPath = (parentPath: string, name: string): string =>
  parentPath ? pathOf([parentPath, name]) : name;

const addressesRow = (path: string): boolean => path.split(FIELD_PATH_SEPARATOR).some(isRowIndex);

export const fieldKeyOfMarker = ({ key, path }: MarkerAddress): string | null => {
  if (key !== undefined) return key;
  return addressesRow(path) ? null : path;
};

const childAtSegment = (value: unknown, segment: string): Found => {
  if (isRowIndex(segment)) return Array.isArray(value) ? { value: value[Number(segment)] } : null;
  return isPlainObject(value) ? { value: value[segment] } : null;
};

export const valueAtPath = (root: unknown, segments: readonly string[]): Found =>
  segments.reduce<Found>((found, segment) => found && childAtSegment(found.value, segment), {
    value: root,
  });

const rowOf = (rows: unknown, rowId: string): Found => {
  const row = rowWithId(rows, rowId);
  return row ? { value: row } : null;
};

const fieldOf = (holder: unknown, name: string): Found => ({
  value: isPlainObject(holder) ? holder[name] : undefined,
});

export const valueAtSteps = (root: unknown, steps: readonly FieldStep[]): Found =>
  steps.reduce<Found>(
    (found, step) =>
      found && ("rowId" in step ? rowOf(found.value, step.rowId) : fieldOf(found.value, step.name)),
    { value: root }
  );

export const valueAtKey = (root: unknown, fieldKey: string): Found =>
  fieldKey
    .split(FIELD_PATH_SEPARATOR)
    .reduce<Found>(
      (found, segment) =>
        found &&
        (Array.isArray(found.value) ? rowOf(found.value, segment) : fieldOf(found.value, segment)),
      { value: root }
    );
