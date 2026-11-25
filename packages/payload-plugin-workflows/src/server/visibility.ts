// The visibility values a run carries (`visibility` option): computed from the document when a run
// starts, and kept in sync when the document's values change. The read rule over them is in
// `access.ts`.

import type { PayloadRequest } from "payload";

import { RUNS_SLUG } from "../constants.js";
import { settingsOf } from "./operations.js";
import type { InstanceDoc, Subject } from "./store.js";
import { writing } from "./transaction.js";

export type VisibilityValues = Record<string, unknown>;

/** A relationship or upload value as stored: a populated document as its id. */
const stored = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stored);
  }
  if (value && typeof value === "object" && "id" in value && !("relationTo" in value)) {
    return (value as { id: unknown }).id;
  }
  return value ?? null;
};

/** The names of the visibility fields, `[]` without `visibility`. */
export const visibilityNames = (req: PayloadRequest): string[] =>
  (settingsOf(req.payload).visibility?.fields ?? []).flatMap((field) =>
    "name" in field ? [field.name] : []
  );

/**
 * The values `visibility.fromDocument` gives for a document, as stored (declared fields only,
 * missing ones `null`); `undefined` without `visibility`. `doc` is what conditions see.
 */
export const visibilityOf = (
  req: PayloadRequest,
  collection: string,
  doc: Record<string, unknown> | null
): VisibilityValues | undefined => {
  const visibility = settingsOf(req.payload).visibility;
  if (!visibility) {
    return undefined;
  }
  const values = doc ? visibility.fromDocument({ doc, collection, req }) : {};
  return Object.fromEntries(
    visibilityNames(req).map((name) => [
      name,
      stored(Object.hasOwn(values ?? {}, name) ? values[name] : null),
    ])
  );
};

/** Whether two sets of values are the same (ids compared as text: `1` and `"1"` are one id). */
export const sameValues = (a: VisibilityValues, b: VisibilityValues): boolean =>
  JSON.stringify(Object.values(a), (_key, value: unknown) =>
    typeof value === "number" ? String(value) : value
  ) ===
  JSON.stringify(Object.values(b), (_key, value: unknown) =>
    typeof value === "number" ? String(value) : value
  );

/** The visibility values a run row holds, in `values`' order. */
export const valuesOfRun = (run: InstanceDoc, like: VisibilityValues): VisibilityValues =>
  Object.fromEntries(Object.keys(like).map((name) => [name, stored(run[name])]));

/**
 * Writes `values` onto every run of the document, finished ones too, in `req`'s transaction
 * (tracked by `writing`). Events follow their run (`readWorkflowEvents`), so nothing else changes.
 */
export const applyVisibility = async (
  req: PayloadRequest,
  subject: Subject,
  values: VisibilityValues
): Promise<void> => {
  await writing(req, () =>
    req.payload.db.updateMany({
      collection: RUNS_SLUG,
      where: {
        and: [
          { subjectCollection: { equals: subject.collection } },
          { subjectId: { equals: subject.id } },
        ],
      },
      data: values,
      req,
      returning: false,
    })
  );
};
