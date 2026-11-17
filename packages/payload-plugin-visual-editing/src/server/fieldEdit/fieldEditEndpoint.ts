import type { Endpoint, Payload, PayloadRequest } from "payload";

import { headersWithCors } from "payload";

import type { VeEdit } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { DraftField, User } from "./draftField.js";
import type { EditedField } from "./editedField.js";

import { isRichTextEdit, readFieldEdit, readRichTextEdit } from "../../shared/fieldEdit.js";
import { valueAtKey } from "../../shared/fieldKey.js";
import { VE_FIELD_EDIT_PATH } from "../../shared/protocol.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { NO_FORMATS } from "../../shared/richText/formats.js";
import { isSameValue } from "../../shared/sameValue.js";
import { bodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  AS_IT_IS_STORED,
  draftFieldOf,
  FIELD_NOT_EDITABLE,
  inLocaleOfProject,
  isRefusal,
  readDraft,
  SIGNED_OUT,
  statusOfFailure,
  UNREADABLE_REQUEST,
} from "./draftField.js";
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

const answer = (saved: boolean, status: number, req: PayloadRequest): Response =>
  Response.json(
    { saved },
    {
      headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
      status,
    }
  );

const saveDraft = (
  payload: Payload,
  document: DocumentToRead,
  data: Record<string, unknown>,
  { autosave, locale, user }: { autosave: boolean; locale: string | undefined; user: User }
): Promise<unknown> => {
  const options = {
    autosave,
    context: { visualEditing: false },
    data,
    depth: 0,
    draft: true,
    fallbackLocale: false as const,
    locale,
    overrideAccess: false,
    overrideLock: false,
    user,
  };
  return document.kind === "global"
    ? payload.updateGlobal({ ...options, slug: document.slug })
    : payload.update({ ...options, collection: document.collection, id: document.id });
};

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

const readEdit = (body: unknown): VeEdit | null => readFieldEdit(body) ?? readRichTextEdit(body);

const editedOf = async (
  payload: Payload,
  user: User,
  { document, schema, shown }: DraftField,
  edit: VeEdit
): Promise<Edited | null> => {
  const { key } = edit;
  if (isRichTextEdit(edit)) {
    const shownRichText = shownRichTextOf(shown, schema, key);
    if (!shownRichText) return null;
    const richTextEdit = {
      formats: formatsOfField(payload, document, shownRichText.steps) ?? NO_FORMATS,
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
  const mediaId = await readableMediaIdOf(payload, user, uploadCollection, value);
  return mediaId === null ? null : (stored) => replacedUploadOf(stored, schema, key, mediaId);
};

export const fieldEditEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return answer(false, SIGNED_OUT, req);

    const posted = readEdit(await bodyOf(req));
    if (!posted) return answer(false, UNREADABLE_REQUEST, req);
    const edit = inLocaleOfProject(payload, posted);

    const field = await draftFieldOf(payload, user, edit);
    if (isRefusal(field)) return answer(false, field.status, req);

    const editedIn = await editedOf(payload, user, field, edit);
    if (!editedIn) return answer(false, FIELD_NOT_EDITABLE, req);

    const stored = await readDraft(payload, field.document, edit, { ...AS_IT_IS_STORED, user });
    const edited = editedIn(stored);
    if (!edited) return answer(false, FIELD_NOT_EDITABLE, req);

    const data = { [edited.name]: edited.value };
    try {
      const saved = await saveDraft(payload, field.document, data, {
        autosave: field.drafts.autosave,
        locale: edit.locale,
        user,
      });
      const written = isRichTextEdit(edit)
        ? await readDraft(payload, field.document, edit, { ...AS_IT_IS_STORED, user })
        : saved;
      if (isLeftAsItWas(stored, written, data, edit.key)) {
        return answer(false, FIELD_NOT_EDITABLE, req);
      }
    } catch (error) {
      return answer(false, statusOfFailure(error), req);
    }
    return answer(true, ANSWERED, req);
  },
  method: "post",
  path: VE_FIELD_EDIT_PATH,
};
