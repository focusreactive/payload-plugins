import type { FormState } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { VeFieldEdit, VeLiveDocument } from "../../shared/protocol.js";

import { textFieldTypeAt } from "../../shared/editableSchema/editableSchema.js";
import { editedTextOf, readFieldEdit } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_TYPE } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { readFormFields } from "../instantPreview/formFields.js";

export type FormEdit = { path: string; value: string };

export type OpenForm = {
  document: VeLiveDocument;
  editableSchema: EditableSchema;
  formState: FormState;
};

const isOfAnotherLocale = (editLocale: string | undefined, formLocale: string | undefined) =>
  Boolean(formLocale) && editLocale !== formLocale;

export function editOfDocument(data: unknown, document: VeLiveDocument): VeFieldEdit | null {
  if (!isPlainObject(data) || data.type !== VE_FIELD_EDIT_TYPE) return null;
  const edit = readFieldEdit(data);
  return edit && documentAddressOf(edit) === documentAddressOf(document) ? edit : null;
}

export function formEditOf(
  edit: VeFieldEdit,
  { document, editableSchema, formState }: OpenForm
): FormEdit | null {
  if (isOfAnotherLocale(edit.locale, document.locale)) return null;

  const field = readFormFields(formState, editableSchema).find(({ key }) => key === edit.key);
  const fieldType = field && textFieldTypeAt(editableSchema, field.steps);
  if (!field || !fieldType || typeof field.value !== "string") return null;
  return { path: field.formPath, value: editedTextOf(fieldType, edit.value) };
}
