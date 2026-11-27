import type { Endpoint, Payload, PayloadRequest, SelectType } from "payload";

import { headersWithCors } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { VeEditedField } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";

import {
  CHANGED_ELSEWHERE,
  NOT_EDITABLE,
  REQUEST_UNREADABLE,
  SAVE_FAILED,
} from "../../shared/fieldEdit.js";
import { topLevelNameOf } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { jsonBodyOf } from "../endpointJson.js";
import { isLocaleOf } from "../localeCodesKeyingValues.js";
import { schemaCacheOf } from "../schemaCache.js";
import { documentOf } from "../unsavedRichText/postedRequest.js";
import { holdsRowAt } from "./editedField.js";

export type SignedInRequest = PayloadRequest & { user: NonNullable<PayloadRequest["user"]> };

export type DraftField = {
  autosave: boolean;
  document: DocumentToRead;
  schema: EditableSchema;
  shown: unknown;
  readStored(): Promise<unknown>;
  heldRowBefore(rowKey: string): Promise<boolean>;
  save(data: Record<string, unknown>): Promise<unknown>;
};

type Refusal = { reason: SaveRefusal; status: number };

type DraftFieldEndpoint<Asked extends VeEditedField, Answer extends object> = {
  path: string;
  readAsked(body: unknown): Asked | null;
  answer(field: DraftField, asked: Asked, req: SignedInRequest): Promise<Answer | Refusal>;
  refusedAnswer: object;
  inTurnPerDocument?: boolean;
};

const ANSWERED = 200;
const UNREADABLE = 400;
const SIGNED_OUT = 401;
const FORBIDDEN = 403;
const UNKNOWN = 404;
const WITHOUT_DRAFTS = 409;
const CHANGED_SINCE_SHOWN = 412;
const NOT_EDITABLE_FIELD = 422;
const LOCKED = 423;
const FAILED = 500;

const REASON_OF_STATUS: ReadonlyMap<number, SaveRefusal> = new Map([
  [SIGNED_OUT, "signed-out"],
  [FORBIDDEN, NOT_EDITABLE],
  [UNKNOWN, NOT_EDITABLE],
  [WITHOUT_DRAFTS, "no-drafts"],
  [CHANGED_SINCE_SHOWN, CHANGED_ELSEWHERE],
  [NOT_EDITABLE_FIELD, NOT_EDITABLE],
  [LOCKED, "locked"],
]);

const refusalOfStatus = (status: number): Refusal => ({
  reason: REASON_OF_STATUS.get(status) ?? SAVE_FAILED,
  status,
});

export const FIELD_NOT_EDITABLE = refusalOfStatus(NOT_EDITABLE_FIELD);

export const FIELD_CHANGED_SINCE_SHOWN = refusalOfStatus(CHANGED_SINCE_SHOWN);

export const DOCUMENT_NOT_UPDATABLE = refusalOfStatus(FORBIDDEN);

const NOT_SIGNED_IN = refusalOfStatus(SIGNED_OUT);

const BODY_UNREADABLE: Refusal = { reason: REQUEST_UNREADABLE, status: UNREADABLE };

const LOCALE_UNKNOWN = refusalOfStatus(UNREADABLE);

const DOCUMENT_UNKNOWN = refusalOfStatus(UNKNOWN);

const DOCUMENT_WITHOUT_DRAFTS = refusalOfStatus(WITHOUT_DRAFTS);

const refusalOfFailure = (error: unknown): Refusal => {
  const status = error instanceof Error && "status" in error ? error.status : undefined;
  return refusalOfStatus(typeof status === "number" ? status : FAILED);
};

const isRefusal = (answered: object): answered is Refusal => "reason" in answered;

const AS_THE_EDITOR_SEES_IT = { overrideAccess: false, showHiddenFields: false };

const AS_IT_IS_STORED = {
  fallbackLocale: false,
  overrideAccess: true,
  showHiddenFields: true,
} as const;

type DraftRead = {
  fallbackLocale?: false;
  overrideAccess: boolean;
  showHiddenFields: boolean;
};

const entityOf = (payload: Payload, document: DocumentToRead) =>
  document.kind === "global"
    ? payload.config.globals.find(({ slug }) => slug === document.slug)
    : payload.collections[document.collection]?.config;

const draftsOf = (payload: Payload, document: DocumentToRead): { autosave: boolean } | null => {
  const entity = entityOf(payload, document);
  if (!entity || ("auth" in entity && entity.auth)) return null;
  const drafts = entity.versions ? entity.versions.drafts : undefined;
  if (!drafts) return null;
  return { autosave: isPlainObject(drafts) && Boolean(drafts.autosave) };
};

const namesLocaleOf = (payload: Payload, locale: string | undefined): boolean =>
  isLocaleOf(payload, locale) && (locale !== undefined || !payload.config.localization);

const inLocaleOfProject = <Asked extends VeEditedField>(payload: Payload, asked: Asked): Asked =>
  payload.config.localization ? asked : { ...asked, locale: undefined };

const selectOf = (key: string): SelectType => ({
  [topLevelNameOf(key)]: true,
});

const readDraft = (
  { payload, user }: SignedInRequest,
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
    user,
  };
  return document.kind === "global"
    ? payload.findGlobal({ ...options, slug: document.slug })
    : payload.findByID({ ...options, collection: document.collection, id: document.id });
};

const heldRowBefore = async (
  { payload }: SignedInRequest,
  document: DocumentToRead,
  { locale }: VeEditedField,
  rowKey: string
): Promise<boolean> => {
  const options = {
    depth: 0,
    fallbackLocale: false as const,
    locale,
    overrideAccess: true,
    pagination: false,
    select: { version: { [topLevelNameOf(rowKey)]: true as const } },
  };
  const { docs } =
    document.kind === "global"
      ? await payload.findGlobalVersions({ ...options, slug: document.slug })
      : await payload.findVersions({
          ...options,
          collection: document.collection,
          where: { parent: { equals: document.id } },
        });
  return docs.some(({ version }) => holdsRowAt(version, rowKey));
};

const saveDraft = (
  { payload, user }: SignedInRequest,
  document: DocumentToRead,
  { locale }: VeEditedField,
  { autosave, data }: { autosave: boolean; data: Record<string, unknown> }
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

const draftFieldOf = async (
  req: SignedInRequest,
  asked: VeEditedField
): Promise<DraftField | Refusal> => {
  const { payload } = req;
  if (!namesLocaleOf(payload, asked.locale)) return LOCALE_UNKNOWN;

  const document = documentOf(payload, asked);
  if (!document) return DOCUMENT_UNKNOWN;

  const drafts = draftsOf(payload, document);
  if (!drafts) return DOCUMENT_WITHOUT_DRAFTS;

  const schema = schemaCacheOf(payload)?.get(asked.collectionSlug, payload);
  if (!schema) return FIELD_NOT_EDITABLE;

  const shown = await readDraft(req, document, asked, AS_THE_EDITOR_SEES_IT);
  const { autosave } = drafts;
  return {
    autosave,
    document,
    heldRowBefore: (row) => heldRowBefore(req, document, asked, row),
    readStored: () => readDraft(req, document, asked, AS_IT_IS_STORED),
    save: (data) => saveDraft(req, document, asked, { autosave, data }),
    schema,
    shown,
  };
};

const answersOfDocuments = new Map<string, Promise<void>>();

const afterEarlierAnswersOf = async <Answered>(
  asked: VeEditedField,
  answer: () => Promise<Answered>
): Promise<Answered> => {
  const address = documentAddressOf(asked);
  const earlierAnswers = answersOfDocuments.get(address);
  let endTheAnswer: (() => void) | undefined;
  const ended = new Promise<void>((resolve) => {
    endTheAnswer = resolve;
  });
  answersOfDocuments.set(address, ended);
  try {
    await earlierAnswers;
    return await answer();
  } finally {
    endTheAnswer?.();
    if (answersOfDocuments.get(address) === ended) answersOfDocuments.delete(address);
  }
};

const isSignedIn = (req: PayloadRequest): req is SignedInRequest => Boolean(req.user);

const respond = (body: object, status: number, req: PayloadRequest): Response =>
  Response.json(body, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });

export const draftFieldEndpoint = <Asked extends VeEditedField, Answer extends object>({
  answer,
  inTurnPerDocument = false,
  path,
  readAsked,
  refusedAnswer,
}: DraftFieldEndpoint<Asked, Answer>): Endpoint => {
  const refuse = ({ reason, status }: Refusal, req: PayloadRequest): Response =>
    respond({ ...refusedAnswer, reason }, status, req);

  const answerAbout = async (req: SignedInRequest, asked: Asked): Promise<Answer | Refusal> => {
    const field = await draftFieldOf(req, asked);
    return isRefusal(field) ? field : answer(field, asked, req);
  };

  return {
    handler: async (req) => {
      if (!isSignedIn(req)) return refuse(NOT_SIGNED_IN, req);

      const posted = readAsked(await jsonBodyOf(req));
      if (!posted) return refuse(BODY_UNREADABLE, req);

      try {
        const asked = inLocaleOfProject(req.payload, posted);
        const answered = await (inTurnPerDocument
          ? afterEarlierAnswersOf(asked, () => answerAbout(req, asked))
          : answerAbout(req, asked));
        return isRefusal(answered) ? refuse(answered, req) : respond(answered, ANSWERED, req);
      } catch (error) {
        return refuse(refusalOfFailure(error), req);
      }
    },
    method: "post",
    path,
  };
};
