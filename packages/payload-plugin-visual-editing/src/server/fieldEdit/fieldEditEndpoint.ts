import type { Endpoint } from "payload";

import type { VeEdit } from "../../shared/protocol.js";
import type { DraftField, SignedInRequest } from "./draftField.js";
import type { EditedField } from "./editedField.js";

import { isRichTextEdit, readFieldEdit, readRichTextEdit } from "../../shared/fieldEdit.js";
import { valueAtKey } from "../../shared/fieldKey.js";
import { VE_FIELD_EDIT_PATH } from "../../shared/protocol.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { NO_FORMATS } from "../../shared/richText/formats.js";
import { isSameValue } from "../../shared/sameValue.js";
import { withoutMarker } from "../../shared/stegaText.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { idOf } from "../../shared/veDocument.js";
import { draftFieldEndpoint, FIELD_CHANGED_SINCE_SHOWN, FIELD_NOT_EDITABLE } from "./draftField.js";
import {
  editedFieldOf,
  editedRichTextOf,
  replacedUploadOf,
  showsText,
  shownRichTextOf,
  shownUploadCollectionOf,
} from "./editedField.js";
import { readableMediaIdOf } from "./readableMedia.js";
import { formatsOfField } from "./richTextFormats.js";

type Edited = (stored: unknown) => EditedField | null;

const comparableAt = (document: unknown, key: string): unknown => {
  const value = valueAtKey(document, key)?.value;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return rootOf(value) ? value : null;
};

export const isLeftAsItWas = (
  stored: unknown,
  saved: unknown,
  sent: unknown,
  key: string
): boolean => {
  const before = comparableAt(stored, key);
  return (
    isSameValue(comparableAt(saved, key), before) && !isSameValue(comparableAt(sent, key), before)
  );
};

const shownAs = (value: unknown): unknown => {
  if (typeof value === "string") return withoutMarker(value);
  const id = idOf(isPlainObject(value) ? value.id : value);
  return id === null ? value : String(id);
};

const holdsTheBaseOf = (edit: VeEdit, documents: readonly unknown[]): boolean => {
  const { base, key, sentBefore } = edit;
  if (base === undefined) return true;
  const startingValues = sentBefore === undefined ? [base] : [base, sentBefore];
  return documents.some((document) => {
    const current = shownAs(valueAtKey(document, key)?.value);
    return startingValues.some((value) => isSameValue(current, shownAs(value)));
  });
};

const readEdit = (body: unknown): VeEdit | null => readFieldEdit(body) ?? readRichTextEdit(body);

const editedOf = async (
  { document, schema, shown }: DraftField,
  edit: VeEdit,
  req: SignedInRequest
): Promise<Edited | null> => {
  const { key } = edit;
  if (isRichTextEdit(edit)) {
    const shownRichText = shownRichTextOf(shown, schema, key);
    if (!shownRichText) return null;
    const richTextEdit = {
      formats: formatsOfField(req.payload, document, shownRichText.steps) ?? NO_FORMATS,
      key,
      shown: shownRichText.value,
      state: edit.state,
    };
    return (stored) => editedRichTextOf(stored, schema, richTextEdit);
  }
  const { value } = edit;
  const uploadCollection = shownUploadCollectionOf(shown, schema, key);
  if (uploadCollection === null) {
    return showsText(shown, schema, key)
      ? (stored) => editedFieldOf(stored, schema, key, value)
      : null;
  }
  const mediaId = await readableMediaIdOf(req, uploadCollection, value);
  return mediaId === null ? null : (stored) => replacedUploadOf(stored, schema, key, mediaId);
};

export const fieldEditEndpoint: Endpoint = draftFieldEndpoint({
  answer: async (field, edit, req) => {
    const editedIn = await editedOf(field, edit, req);
    if (!editedIn) return FIELD_NOT_EDITABLE;

    const stored = await field.readStored();
    const edited = editedIn(stored);
    if (!edited) return FIELD_NOT_EDITABLE;
    if (!holdsTheBaseOf(edit, [field.shown, stored])) return FIELD_CHANGED_SINCE_SHOWN;

    const data = { [edited.name]: edited.value };
    const saved = await field.save(data);
    const written = isRichTextEdit(edit) ? await field.readStored() : saved;
    if (isLeftAsItWas(stored, written, data, edit.key)) return FIELD_NOT_EDITABLE;

    const value = edit.base === undefined ? {} : { value: valueAtKey(saved, edit.key)?.value };
    return { autosave: field.autosave, saved: true, ...value };
  },
  inTurnPerDocument: true,
  path: VE_FIELD_EDIT_PATH,
  readAsked: readEdit,
  refusedAnswer: { saved: false },
});
