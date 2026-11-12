import { dequal } from "dequal/lite";
import type { FormState } from "payload";

import { readPath } from "../readPath";

const isEmptyValue = (value: unknown) => value === null || value === undefined || value === "";

const isSameValue = (a: unknown, b: unknown) =>
  (isEmptyValue(a) && isEmptyValue(b)) || dequal(a, b);

export function editedPathsIn(fields: FormState): string[] {
  return Object.keys(fields).filter((path) => fields[path]?.isModified);
}

export function fieldsMissingEditMark(
  fields: FormState,
  editedPaths: ReadonlySet<string>
): FormState {
  const remarked: FormState = {};

  for (const path of editedPaths) {
    const field = fields[path];
    if (field && !field.isModified) {
      remarked[path] = { ...field, isModified: true };
    }
  }

  return remarked;
}

export function hasUnsavedEdits(
  fields: FormState,
  editedPaths: ReadonlySet<string>,
  savedDoc: Record<string, unknown>
): boolean {
  for (const path of editedPaths) {
    const field = fields[path];
    if (field && !field.rows && !isSameValue(field.value, readPath(savedDoc, path))) {
      return true;
    }
  }

  return false;
}
