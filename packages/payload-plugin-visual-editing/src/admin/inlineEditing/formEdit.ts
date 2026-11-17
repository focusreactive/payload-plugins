import type { FormState } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { VeLiveDocument } from "../../shared/protocol.js";

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
  Boolean(editLocale && formLocale && editLocale !== formLocale);

export function formEditOf(
  data: unknown,
  { document, editableSchema, formState }: OpenForm
): FormEdit | null {
  if (!isPlainObject(data) || data.type !== VE_FIELD_EDIT_TYPE) return null;
  const edit = readFieldEdit(data);
  if (!edit || documentAddressOf(edit) !== documentAddressOf(document)) return null;
  if (isOfAnotherLocale(edit.locale, document.locale)) return null;

  const field = readFormFields(formState, editableSchema).find(({ key }) => key === edit.key);
  const fieldType = field && textFieldTypeAt(editableSchema, field.steps);
  if (!field || !fieldType) return null;
  return { path: field.formPath, value: editedTextOf(fieldType, edit.value) };
}
