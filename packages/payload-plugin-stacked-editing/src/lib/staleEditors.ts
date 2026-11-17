import type { FormState } from "payload";

const LEXICAL_IDLE_WRITE_MS = 750;

type Dispatch = (action: { type: "UPDATE"; path: string; initialValue: unknown }) => void;

export const isEditorState = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "root" in value &&
  typeof (value as { root: unknown }).root === "object";

export const staleEditorPaths = (fields: FormState, rowPath: string): string[] =>
  Object.entries(fields)
    .filter(
      ([path, field]) =>
        path.startsWith(`${rowPath}.`) &&
        isEditorState(field.value) &&
        field.value !== field.initialValue
    )
    .map(([path]) => path);

export const refreshDetachedEditors = ({
  dispatchFields,
  getFields,
  rowPath,
}: {
  dispatchFields: unknown;
  getFields: () => FormState;
  rowPath: string;
}): void => {
  const dispatch = dispatchFields as Dispatch;
  // Lexical re-reads the form value only when `initialValue` changes, so this re-syncs the row's hidden copies.
  const pointInitialValuesAtCurrentValues = () => {
    const fields = getFields();
    for (const path of staleEditorPaths(fields, rowPath)) {
      dispatch({ type: "UPDATE", path, initialValue: fields[path]?.value });
    }
  };
  pointInitialValuesAtCurrentValues();
  // Lexical writes its value on idle, possibly after the panel has unmounted.
  setTimeout(pointInitialValuesAtCurrentValues, LEXICAL_IDLE_WRITE_MS);
};
