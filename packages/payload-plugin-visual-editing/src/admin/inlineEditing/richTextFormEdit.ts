import type { VeEditedField, VeEditorState, VeLiveDocument } from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { isRichTextAt } from "../../shared/editableSchema/editableSchema.js";
import { readEditedField, readRichTextEdit } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";

import { withoutBlockFields } from "../../shared/richText/blockNodes.js";
import { fixedNodesOf } from "../../shared/richText/editableNodes.js";
import { editedStateOf } from "../../shared/richText/editedState.js";
import { isEditorStateTree } from "../../shared/richText/editorStateTree.js";
import { formatsIn, NO_FORMATS, readFormats, withFormats } from "../../shared/richText/formats.js";
import { documentAddressOf, editedFieldAddressOf } from "../../shared/veDocument.js";
import { isOfAnotherLocale, updatableFormFieldOf } from "./formEdit.js";

export type RichTextOfForm = { path: string; value: VeEditorState };

export type PostedRichTextEdit = { field: VeEditedField; state: VeEditorState | null };

export type BegunEdit = { formats: VeRichTextFormats; state: VeEditorState };

export type FetchEditorFormats = (field: VeEditedField) => Promise<VeRichTextFormats | null>;

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

export function richTextOfForm(field: VeEditedField, openForm: OpenForm): RichTextOfForm | null {
  if (isOfAnotherLocale(field.locale, openForm.document.locale)) return null;

  const formField = updatableFormFieldOf(field.key, openForm, isRichTextAt);
  if (!formField || !isEditorStateTree(formField.value)) return null;
  return { path: formField.formPath, value: formField.value };
}

export const stateForThePage = ({ value }: RichTextOfForm): VeEditorState =>
  withoutBlockFields(value);

export const allowedFormatsOf = (
  { value }: RichTextOfForm,
  ofEditor: VeRichTextFormats | null
): VeRichTextFormats => withFormats(ofEditor ?? NO_FORMATS, formatsIn(value));

const formatsOfAnswer = (answer: unknown): VeRichTextFormats | null =>
  isPlainObject(answer) ? readFormats(answer.formats) : null;

export const fetchEditorFormatsFrom =
  (apiUrl: string): FetchEditorFormats =>
  async (field) => {
    try {
      const response = await fetch(`${apiUrl}${VE_RICH_TEXT_VALUE_PATH}`, {
        body: JSON.stringify(field),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return response.ok ? formatsOfAnswer(await response.json()) : null;
    } catch {
      return null;
    }
  };

export function richTextFormEditOf(
  { field, state }: PostedRichTextEdit,
  openForm: OpenForm,
  begun: BegunEdit | null = null
): RichTextOfForm | null {
  const held = richTextOfForm(field, openForm);
  if (!held || !state) return null;
  const value = editedStateOf(state, {
    formats: allowedFormatsOf(held, begun?.formats ?? null),
    shown: begun?.state ?? held.value,
    stored: held.value,
    ...(begun && { remembered: fixedNodesOf(begun.state) }),
  });
  return value && { path: held.path, value };
}

export type RunningEdits = {
  answered(field: VeEditedField, begun: BegunEdit): void;
  beginningOf(field: VeEditedField): BegunEdit | null;
  ended(field: VeEditedField): void;
  forget(): void;
};

export function createRunningEdits(): RunningEdits {
  const begunEdits = new Map<string, BegunEdit>();
  return {
    answered(field, begun) {
      begunEdits.set(editedFieldAddressOf(field), begun);
    },
    beginningOf: (field) => begunEdits.get(editedFieldAddressOf(field)) ?? null,
    ended(field) {
      begunEdits.delete(editedFieldAddressOf(field));
    },
    forget() {
      begunEdits.clear();
    },
  };
}
