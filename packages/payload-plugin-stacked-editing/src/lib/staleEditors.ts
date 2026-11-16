import type { FormState } from "payload";

const LEXICAL_IDLE_WRITE_MS = 750;

type Dispatch = (action: { type: "UPDATE"; path: string; initialValue: unknown }) => void;

/** Lexical's serialized editor state — the one value shape whose editor keeps its own copy. */
export const isEditorState = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "root" in value &&
  typeof (value as { root: unknown }).root === "object";

/**
 * Paths under `rowPath` whose rich text changed since the form was loaded/saved — the editors that
 * other mounted copies of the row (the hidden inline row, a parent panel) still show stale.
 */
export const staleEditorPaths = (fields: FormState, rowPath: string): string[] =>
  Object.entries(fields)
    .filter(
      ([path, field]) =>
        path.startsWith(`${rowPath}.`) &&
        isEditorState(field.value) &&
        field.value !== field.initialValue
    )
    .map(([path]) => path);

/**
 * Lexical only reads the form value when it mounts, and re-mounts when the field's `initialValue`
 * changes to something that differs from what it last emitted. A row's fields are mounted more than
 * once while its panel is open (Payload keeps collapsed rows mounted), so when a panel closes, the
 * other copies of every rich text edited in it are re-synced by pointing `initialValue` at the
 * current value. Nothing else changes: `value` (what is saved) is untouched and `UPDATE` without a
 * `value` does not mark the form modified.
 *
 * Lexical writes its value on idle (up to ~500 ms after the last keystroke), possibly after the
 * panel has unmounted, so the sync runs again once that window has passed.
 */
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
  const run = () => {
    const fields = getFields();
    for (const path of staleEditorPaths(fields, rowPath)) {
      dispatch({ type: "UPDATE", path, initialValue: fields[path]?.value });
    }
  };
  run();
  setTimeout(run, LEXICAL_IDLE_WRITE_MS);
};
