import type { FormState } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { FieldStep } from "../../shared/fieldKey.js";

import { isMarkable } from "../../shared/editableSchema/editableSchema.js";
import { FIELD_PATH_SEPARATOR, fieldKeyOf } from "../../shared/fieldKey.js";

export type FormField = { key: string; steps: readonly FieldStep[]; value: unknown };

type FormEntry = FormState[string] | undefined;

type WalkedPath = { entry: FormEntry; steps: readonly FieldStep[] };

const FORM_ROOT: WalkedPath = { entry: undefined, steps: [] };
const NO_SEPARATOR = -1;

const stepInto = ({ entry }: WalkedPath, segment: string): FieldStep | null => {
  if (!entry?.rows) return { name: segment };
  const row = entry.rows[Number(segment)];
  if (!row) return null;
  return { rowId: row.id, ...(row.blockType !== undefined && { blockType: row.blockType }) };
};

export function readFormFields(formState: FormState, editableSchema: EditableSchema): FormField[] {
  const walkedPaths = new Map<string, WalkedPath | null>();

  const walk = (formPath: string): WalkedPath | null => {
    const alreadyWalked = walkedPaths.get(formPath);
    if (alreadyWalked !== undefined) return alreadyWalked;

    const lastSeparator = formPath.lastIndexOf(FIELD_PATH_SEPARATOR);
    const parent =
      lastSeparator === NO_SEPARATOR ? FORM_ROOT : walk(formPath.slice(0, lastSeparator));
    const lastSegment = formPath.slice(lastSeparator + FIELD_PATH_SEPARATOR.length);
    const step = parent && stepInto(parent, lastSegment);
    const walked = step && { entry: formState[formPath], steps: [...parent.steps, step] };
    walkedPaths.set(formPath, walked);
    return walked;
  };

  return Object.keys(formState).flatMap((formPath) => {
    const walked = walk(formPath);
    if (!walked?.entry || walked.entry.rows !== undefined) return [];
    if (!isMarkable(editableSchema, walked.steps)) return [];
    return [{ key: fieldKeyOf(walked.steps), steps: walked.steps, value: walked.entry.value }];
  });
}
