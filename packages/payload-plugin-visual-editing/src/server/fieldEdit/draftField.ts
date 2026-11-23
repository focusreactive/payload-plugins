import type { Payload, PayloadRequest, SelectType } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { VeEditedField } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";

import { CHANGED_ELSEWHERE, SAVE_FAILED } from "../../shared/fieldEdit.js";
import { topLevelNameOf } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { isLocaleOf } from "../localeCodesKeyingValues.js";
import { schemaCacheOf } from "../schemaCache.js";
import { documentOf } from "../unsavedRichText/postedRequest.js";

export type User = NonNullable<PayloadRequest["user"]>;

export type Drafts = { autosave: boolean };

export type DraftRead = {
  fallbackLocale?: false;
  overrideAccess: boolean;
  showHiddenFields: boolean;
  user: User;
};

export type DraftField = {
  document: DocumentToRead;
  drafts: Drafts;
  schema: EditableSchema;
  shown: unknown;
};

export type Refusal = { status: number };

export const SIGNED_OUT = 401;
export const UNREADABLE_REQUEST = 400;
export const FORBIDDEN = 403;
export const UNKNOWN_DOCUMENT = 404;
export const WITHOUT_DRAFTS = 409;
export const CHANGED_SINCE_SHOWN = 412;
export const FIELD_NOT_EDITABLE = 422;
export const LOCKED = 423;
export const FAILED = 500;
export const ANSWERED = 200;

const REFUSAL_OF_STATUS: ReadonlyMap<number, SaveRefusal> = new Map([
  [SIGNED_OUT, "signed-out"],
  [FORBIDDEN, "not-editable"],
  [UNKNOWN_DOCUMENT, "not-editable"],
  [WITHOUT_DRAFTS, "no-drafts"],
  [CHANGED_SINCE_SHOWN, CHANGED_ELSEWHERE],
  [FIELD_NOT_EDITABLE, "not-editable"],
  [LOCKED, "locked"],
]);

export const refusalOfStatus = (status: number): SaveRefusal =>
  REFUSAL_OF_STATUS.get(status) ?? SAVE_FAILED;

export const AS_THE_EDITOR_SEES_IT = { overrideAccess: false, showHiddenFields: false };

export const AS_IT_IS_STORED = {
  fallbackLocale: false,
  overrideAccess: true,
  showHiddenFields: true,
} as const;

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

export const inLocaleOfProject = <Field extends VeEditedField>(
  payload: Payload,
  field: Field
): Field => (payload.config.localization ? field : { ...field, locale: undefined });

const selectOf = (key: string): SelectType => ({
  [topLevelNameOf(key)]: true,
});

export const readDraft = (
  payload: Payload,
  document: DocumentToRead,
  { key, locale }: VeEditedField,
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

export const isRefusal = (field: DraftField | Refusal): field is Refusal => "status" in field;

export const statusOfFailure = (error: unknown): number => {
  const status = error instanceof Error && "status" in error ? error.status : undefined;
  return typeof status === "number" ? status : FAILED;
};

export const draftFieldOf = async (
  payload: Payload,
  user: User,
  field: VeEditedField
): Promise<DraftField | Refusal> => {
  if (!namesLocaleOf(payload, field.locale)) return { status: UNREADABLE_REQUEST };

  const document = documentOf(payload, field);
  if (!document) return { status: UNKNOWN_DOCUMENT };

  const drafts = draftsOf(payload, document);
  if (!drafts) return { status: WITHOUT_DRAFTS };

  const schema = schemaCacheOf(payload)?.get(field.collectionSlug, payload);
  if (!schema) return { status: FIELD_NOT_EDITABLE };

  const shown = await readDraft(payload, document, field, { ...AS_THE_EDITOR_SEES_IT, user });
  return { document, drafts, schema, shown };
};
