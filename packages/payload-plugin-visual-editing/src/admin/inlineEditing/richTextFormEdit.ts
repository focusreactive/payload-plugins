import type { VeEditedField, VeEditorState, VeLiveDocument } from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { isRichTextAt } from "../../shared/editableSchema/editableSchema.js";
import { readEditedField, readRichTextEdit } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
} from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";

import { withoutBlockFields } from "../../shared/richText/blockNodes.js";
import { fixedNodesOf } from "../../shared/richText/editableNodes.js";
import { editedStateOf } from "../../shared/richText/editedState.js";
import { isEditorStateTree } from "../../shared/richText/editorStateTree.js";
import { formatsIn } from "../../shared/richText/formats.js";
import { documentAddressOf, keyedFieldAddressOf } from "../../shared/veDocument.js";
import { readFormFields } from "../instantPreview/formFields.js";
import { isOfAnotherLocale } from "./formEdit.js";

export type RichTextOfForm = { path: string; value: VeEditorState };

export type PostedRichTextEdit = { field: VeEditedField; state: VeEditorState | null };

const fieldOfDocument = (
  data: unknown,
  type: string,
  document: VeLiveDocument
): VeEditedField | null => {
  if (!isPlainObject(data) || data.type !== type) return null;
  const field = readEditedField(data);
  return field && documentAddressOf(field) === documentAddressOf(document) ? field : null;
};

export const stateRequestOfDocument = (
  data: unknown,
  document: VeLiveDocument
): VeEditedField | null => fieldOfDocument(data, VE_RICH_TEXT_STATE_REQUEST_TYPE, document);

export const endedEditOfDocument = (
  data: unknown,
  document: VeLiveDocument
): VeEditedField | null => fieldOfDocument(data, VE_RICH_TEXT_EDIT_ENDED_TYPE, document);

export function richTextEditOfDocument(
  data: unknown,
  document: VeLiveDocument
): PostedRichTextEdit | null {
  const field = fieldOfDocument(data, VE_RICH_TEXT_EDIT_TYPE, document);
  return field && { field, state: readRichTextEdit(data)?.state ?? null };
}

export function richTextOfForm(
  field: VeEditedField,
  { document, editableSchema, formState }: OpenForm
): RichTextOfForm | null {
  if (isOfAnotherLocale(field.locale, document.locale)) return null;

  const formField = readFormFields(formState, editableSchema, isRichTextAt).find(
    ({ key }) => key === field.key
  );
  if (!formField || !isEditorStateTree(formField.value)) return null;
  return { path: formField.formPath, value: formField.value };
}

export const stateForThePage = ({ value }: RichTextOfForm): VeEditorState =>
  withoutBlockFields(value);

export const formatsForThePage = ({ value }: RichTextOfForm): VeRichTextFormats => formatsIn(value);

export function richTextFormEditOf(
  { field, state }: PostedRichTextEdit,
  openForm: OpenForm,
  begunWith: VeEditorState | null = null
): RichTextOfForm | null {
  const held = richTextOfForm(field, openForm);
  if (!held || !state) return null;
  const value = editedStateOf(state, {
    formats: formatsIn(held.value),
    shown: begunWith ?? held.value,
    stored: held.value,
    ...(begunWith && { remembered: fixedNodesOf(begunWith) }),
  });
  return value && { path: held.path, value };
}

export type RunningEdits = {
  answered(field: VeEditedField, state: VeEditorState): void;
  stateAtTheBeginningOf(field: VeEditedField): VeEditorState | null;
  ended(field: VeEditedField): void;
  forget(): void;
};

const addressOf = (field: VeEditedField): string =>
  JSON.stringify([keyedFieldAddressOf(field), field.locale ?? null]);

export function createRunningEdits(): RunningEdits {
  const answeredStates = new Map<string, VeEditorState>();
  return {
    answered(field, state) {
      answeredStates.set(addressOf(field), state);
    },
    ended(field) {
      answeredStates.delete(addressOf(field));
    },
    forget() {
      answeredStates.clear();
    },
    stateAtTheBeginningOf: (field) => answeredStates.get(addressOf(field)) ?? null,
  };
}
