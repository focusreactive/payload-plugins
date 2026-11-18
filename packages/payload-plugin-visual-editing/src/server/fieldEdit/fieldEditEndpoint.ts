import type { Endpoint, Payload, PayloadRequest, SelectType } from "payload";

import { headersWithCors } from "payload";

import type { VeFieldEdit } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";

import { readFieldEdit } from "../../shared/fieldEdit.js";
import { FIELD_PATH_SEPARATOR } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_PATH } from "../../shared/protocol.js";
import { bodyOf } from "../endpointJson.js";
import { isLocaleOf } from "../localeCodesKeyingValues.js";
import { schemaCacheOf } from "../schemaCache.js";
import { documentOf } from "../unsavedRichText/postedRequest.js";
import { editedFieldOf, showsText } from "./editedField.js";

type User = NonNullable<PayloadRequest["user"]>;

type Drafts = { autosave: boolean };

const SIGNED_OUT = 401;
const UNREADABLE_EDIT = 400;
const UNKNOWN_DOCUMENT = 404;
const WITHOUT_DRAFTS = 409;
const FIELD_NOT_EDITABLE = 422;
const FAILED = 500;
const SAVED = 200;

const answer = (saved: boolean, status: number, req: PayloadRequest): Response =>
  Response.json(
    { saved },
    {
      headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
      status,
    }
  );

const entityOf = (payload: Payload, document: DocumentToRead) =>
  document.kind === "global"
    ? payload.config.globals.find(({ slug }) => slug === document.slug)
    : payload.collections[document.collection]?.config;

const draftsOf = (payload: Payload, document: DocumentToRead): Drafts | null => {
  const entity = entityOf(payload, document);
  if (!entity || ("auth" in entity && entity.auth)) return null;
  const drafts = entity.versions ? entity.versions.drafts : undefined;
  if (!drafts) return null;
  return { autosave: isPlainObject(drafts) && Boolean(drafts.autosave) };
};

const namesLocaleOf = (payload: Payload, locale: string | undefined): boolean =>
  isLocaleOf(payload, locale) && (locale !== undefined || !payload.config.localization);

const selectOf = (key: string): SelectType => ({
  [key.split(FIELD_PATH_SEPARATOR)[0] ?? key]: true,
});

type DraftRead = {
  fallbackLocale?: false;
  overrideAccess: boolean;
  showHiddenFields: boolean;
  user: User;
};

const AS_THE_EDITOR_SEES_IT = { overrideAccess: false, showHiddenFields: false };

const AS_IT_IS_STORED = {
  fallbackLocale: false,
  overrideAccess: true,
  showHiddenFields: true,
} as const;

const readDraft = (
  payload: Payload,
  document: DocumentToRead,
  { key, locale }: VeFieldEdit,
  read: DraftRead
): Promise<unknown> => {
  const options = {
    ...read,
    context: { visualEditing: false },
    depth: 0,
    disableErrors: true,
    draft: true,
    locale,
    select: selectOf(key),
  };
  return document.kind === "global"
    ? payload.findGlobal({ ...options, slug: document.slug })
    : payload.findByID({ ...options, collection: document.collection, id: document.id });
};

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

const statusOfFailure = (error: unknown): number => {
  const status = error instanceof Error && "status" in error ? error.status : undefined;
  return typeof status === "number" ? status : FAILED;
};

export const fieldEditEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return answer(false, SIGNED_OUT, req);

    const edit = readFieldEdit(await bodyOf(req));
    if (!edit || !namesLocaleOf(payload, edit.locale)) return answer(false, UNREADABLE_EDIT, req);

    const document = documentOf(payload, edit);
    if (!document) return answer(false, UNKNOWN_DOCUMENT, req);

    const drafts = draftsOf(payload, document);
    if (!drafts) return answer(false, WITHOUT_DRAFTS, req);

    const schema = schemaCacheOf(payload)?.get(edit.collectionSlug, payload);
    const shown = await readDraft(payload, document, edit, { ...AS_THE_EDITOR_SEES_IT, user });
    if (!schema || !showsText(shown, schema, edit.key)) {
      return answer(false, FIELD_NOT_EDITABLE, req);
    }

    const stored = await readDraft(payload, document, edit, { ...AS_IT_IS_STORED, user });
    const edited = editedFieldOf(stored, schema, edit.key, edit.value);
    if (!edited) return answer(false, FIELD_NOT_EDITABLE, req);

    try {
      await saveDraft(
        payload,
        document,
        { [edited.name]: edited.value },
        {
          autosave: drafts.autosave,
          locale: edit.locale,
          user,
        }
      );
    } catch (error) {
      return answer(false, statusOfFailure(error), req);
    }
    return answer(true, SAVED, req);
  },
  method: "post",
  path: VE_FIELD_EDIT_PATH,
};
