import type { Endpoint, Payload, PayloadRequest } from "payload";

import { headersWithCors } from "payload";

import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { VeEdit } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { DraftField, User } from "./draftField.js";
import type { EditedField } from "./editedField.js";

import {
  isRichTextEdit,
  readFieldEdit,
  readRichTextEdit,
  REQUEST_UNREADABLE,
} from "../../shared/fieldEdit.js";
import { valueAtKey } from "../../shared/fieldKey.js";
import { VE_FIELD_EDIT_PATH } from "../../shared/protocol.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { NO_FORMATS } from "../../shared/richText/formats.js";
import { isSameValue } from "../../shared/sameValue.js";
import { withoutMarker } from "../../shared/stegaText.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { documentAddressOf, idOf } from "../../shared/veDocument.js";
import { jsonBodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  AS_IT_IS_STORED,
  CHANGED_SINCE_SHOWN,
  draftFieldOf,
  FIELD_NOT_EDITABLE,
  inLocaleOfProject,
  isRefusal,
  readDraft,
  refusalOfStatus,
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

const answer = (body: object, status: number, req: PayloadRequest): Response =>
  Response.json(body, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });

const refuse = (
  status: number,
  req: PayloadRequest,
  reason: SaveRefusal = refusalOfStatus(status)
): Response => answer({ reason, saved: false }, status, req);

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

const savedEdit = async (
  payload: Payload,
  user: User,
  edit: VeEdit,
  req: PayloadRequest
): Promise<Response> => {
  const field = await draftFieldOf(payload, user, edit);
  if (isRefusal(field)) return refuse(field.status, req);

  const editedIn = await editedOf(payload, user, field, edit);
  if (!editedIn) return refuse(FIELD_NOT_EDITABLE, req);

  const stored = await readDraft(payload, field.document, edit, { ...AS_IT_IS_STORED, user });
  const edited = editedIn(stored);
  if (!edited) return refuse(FIELD_NOT_EDITABLE, req);
  if (!holdsTheBaseOf(edit, [field.shown, stored])) return refuse(CHANGED_SINCE_SHOWN, req);

  const data = { [edited.name]: edited.value };
  const saved = await saveDraft(payload, field.document, data, {
    autosave: field.drafts.autosave,
    locale: edit.locale,
    user,
  });
  const written = isRichTextEdit(edit)
    ? await readDraft(payload, field.document, edit, { ...AS_IT_IS_STORED, user })
    : saved;
  if (isLeftAsItWas(stored, written, data, edit.key)) {
    return refuse(FIELD_NOT_EDITABLE, req);
  }
  const value = edit.base === undefined ? {} : { value: valueAtKey(saved, edit.key)?.value };
  return answer({ autosave: field.drafts.autosave, saved: true, ...value }, ANSWERED, req);
};

const savesOfDocuments = new Map<string, Promise<void>>();

const afterEarlierSavesOf = async <Result>(
  edit: VeEdit,
  save: () => Promise<Result>
): Promise<Result> => {
  const address = documentAddressOf(edit);
  const earlierSaves = savesOfDocuments.get(address);
  let endTheSave: (() => void) | undefined;
  const ended = new Promise<void>((resolve) => {
    endTheSave = resolve;
  });
  savesOfDocuments.set(address, ended);
  try {
    await earlierSaves;
    return await save();
  } finally {
    endTheSave?.();
    if (savesOfDocuments.get(address) === ended) savesOfDocuments.delete(address);
  }
};

export const fieldEditEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return refuse(SIGNED_OUT, req);

    const posted = readEdit(await jsonBodyOf(req));
    if (!posted) return refuse(UNREADABLE_REQUEST, req, REQUEST_UNREADABLE);

    try {
      const edit = inLocaleOfProject(payload, posted);
      return await afterEarlierSavesOf(edit, () => savedEdit(payload, user, edit, req));
    } catch (error) {
      return refuse(statusOfFailure(error), req);
    }
  },
  method: "post",
  path: VE_FIELD_EDIT_PATH,
};
