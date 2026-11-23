import type { FormState, SanitizedDocumentPermissions } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { VeFieldEdit, VeLiveDocument } from "../../shared/protocol.js";
import type { FormField } from "../instantPreview/formFields.js";

import { textFieldTypeAt } from "../../shared/editableSchema/editableSchema.js";
import { editedTextOf, readFieldEdit } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_TYPE } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { readFormFields } from "../instantPreview/formFields.js";
import { mayUpdateFieldAt } from "./fieldPermissions.js";

export type FormEdit = { path: string; value: string };

export type OpenForm = {
  document: VeLiveDocument;
  editableSchema: EditableSchema;
  formState: FormState;
  permissions: SanitizedDocumentPermissions | undefined;
};

export const isOfAnotherLocale = (editLocale: string | undefined, formLocale: string | undefined) =>
  Boolean(formLocale) && editLocale !== formLocale;

export function updatableFormFieldOf(
  key: string,
  { editableSchema, formState, permissions }: OpenForm,
  lists?: Parameters<typeof readFormFields>[2]
): FormField | null {
  const field = readFormFields(formState, editableSchema, lists).find(
    (candidate) => candidate.key === key
  );
  return field && mayUpdateFieldAt(permissions, field.steps) ? field : null;
}

export function editOfDocument(data: unknown, document: VeLiveDocument): VeFieldEdit | null {
  if (!isPlainObject(data) || data.type !== VE_FIELD_EDIT_TYPE) return null;
  const edit = readFieldEdit(data);
  return edit && documentAddressOf(edit) === documentAddressOf(document) ? edit : null;
}

export function formEditOf(edit: VeFieldEdit, openForm: OpenForm): FormEdit | null {
  if (isOfAnotherLocale(edit.locale, openForm.document.locale)) return null;

  const field = updatableFormFieldOf(edit.key, openForm);
  const fieldType = field && textFieldTypeAt(openForm.editableSchema, field.steps);
  if (!field || !fieldType || typeof field.value !== "string") return null;
  return { path: field.formPath, value: editedTextOf(fieldType, edit.value) };
}
