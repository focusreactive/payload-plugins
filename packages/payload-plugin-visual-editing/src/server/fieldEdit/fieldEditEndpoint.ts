import type { Endpoint, Payload, PayloadRequest } from "payload";

import { headersWithCors } from "payload";

import type { VeFieldEdit } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { DraftField, User } from "./draftField.js";
import type { EditedField } from "./editedField.js";

import { readFieldEdit } from "../../shared/fieldEdit.js";
import { VE_FIELD_EDIT_PATH } from "../../shared/protocol.js";
import { bodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  AS_IT_IS_STORED,
  draftFieldOf,
  FIELD_NOT_EDITABLE,
  isRefusal,
  readDraft,
  SIGNED_OUT,
  statusOfFailure,
  UNREADABLE_REQUEST,
} from "./draftField.js";
import {
  editedFieldOf,
  replacedUploadOf,
  showsText,
  shownUploadCollectionOf,
} from "./editedField.js";
import { readableMediaIdOf } from "./readableMedia.js";

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
    locale,
    overrideAccess: false,
    overrideLock: false,
    user,
  };
  return document.kind === "global"
    ? payload.updateGlobal({ ...options, slug: document.slug })
    : payload.update({ ...options, collection: document.collection, id: document.id });
};

const editedOf = async (
  payload: Payload,
  user: User,
  { schema, shown }: DraftField,
  { key, value }: VeFieldEdit
): Promise<Edited | null> => {
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

    const edit = readFieldEdit(await bodyOf(req));
    if (!edit) return answer(false, UNREADABLE_REQUEST, req);

    const field = await draftFieldOf(payload, user, edit);
    if (isRefusal(field)) return answer(false, field.status, req);

    const editedIn = await editedOf(payload, user, field, edit);
    if (!editedIn) return answer(false, FIELD_NOT_EDITABLE, req);

    const stored = await readDraft(payload, field.document, edit, { ...AS_IT_IS_STORED, user });
    const edited = editedIn(stored);
    if (!edited) return answer(false, FIELD_NOT_EDITABLE, req);

    try {
      await saveDraft(
        payload,
        field.document,
        { [edited.name]: edited.value },
        {
          autosave: field.drafts.autosave,
          locale: edit.locale,
          user,
        }
      );
    } catch (error) {
      return answer(false, statusOfFailure(error), req);
    }
    return answer(true, ANSWERED, req);
  },
  method: "post",
  path: VE_FIELD_EDIT_PATH,
};
