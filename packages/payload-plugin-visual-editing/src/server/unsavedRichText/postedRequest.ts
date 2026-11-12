import type { Payload } from "payload";

import type { LiveRichTextField, VeEditorState } from "../../shared/protocol.js";

import { schemaPathOfRichText } from "../../shared/editableSchema/editableSchema.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { isRichTextNodeKey } from "../../shared/richText/nodeKey.js";
import { isVeDocument, veDocumentOf } from "../../shared/veDocument.js";
import { isLocaleOf } from "../localeCodesKeyingValues.js";
import { schemaCacheOf } from "../schemaCache.js";
import { readJsonBody } from "./jsonBody.js";
import { readPostedEditorState } from "./postedEditorState.js";

const MAX_BYTES_PER_CHARACTER = 3;
const MAX_REQUEST_ENVELOPE_BYTES = 4096;
const MISSING_SCHEMA_CACHE_MESSAGE =
  "readUnsavedRichText found no schema cache of the visual editing plugin in config.custom, so it reads no unsaved rich text. Turn on instantPreview of the plugin and keep its config.custom of the plugin when a later plugin replaces custom.";

export type PostedRequest =
  | { headers: Headers; request: unknown }
  | { headers?: never; request: Request };

type DocumentToRead =
  | { collection: string; id: number | string; kind: "collection" }
  | { kind: "global"; slug: string };

export type Unsaved = {
  document: DocumentToRead;
  field: LiveRichTextField;
  fieldPath: string;
  locale: string | undefined;
  state: VeEditorState;
};

export type User = Awaited<ReturnType<Payload["auth"]>>["user"];

export type SignedIn = { unsaved: Unsaved; user: NonNullable<User> };

export type PostedReadLimits = { maxStateLength: number; signal: AbortSignal };

const NUMBER_ID_TYPE = "number";

const readField = (field: unknown): LiveRichTextField | null => {
  if (!isPlainObject(field) || !isVeDocument(field) || typeof field.key !== "string") return null;
  if (isRichTextNodeKey(field.key)) return null;
  return { ...veDocumentOf(field as LiveRichTextField), key: field.key };
};

const idOfCollection = (payload: Payload, collection: string, docId: string) => {
  const idType = payload.collections[collection]?.customIDType ?? payload.db.defaultIDType;
  if (idType !== NUMBER_ID_TYPE) return docId === "" ? null : docId;
  const id = Number(docId);
  return Number.isSafeInteger(id) && String(id) === docId ? id : null;
};

const documentOf = (
  payload: Payload,
  { collectionSlug, docId, kind }: LiveRichTextField
): DocumentToRead | null => {
  if (kind === "global") {
    const isGlobal = payload.config.globals.some(({ slug }) => slug === collectionSlug);
    return isGlobal && docId === undefined ? { kind, slug: collectionSlug } : null;
  }
  if (docId === undefined || !Object.hasOwn(payload.collections, collectionSlug)) return null;
  const id = idOfCollection(payload, collectionSlug, docId);
  return id === null ? null : { collection: collectionSlug, id, kind };
};

const warnedOfMissingSchemaCache = new WeakSet<Payload>();

const warnOnceOfMissingSchemaCache = (payload: Payload): void => {
  if (warnedOfMissingSchemaCache.has(payload)) return;
  warnedOfMissingSchemaCache.add(payload);
  payload.logger.warn(MISSING_SCHEMA_CACHE_MESSAGE);
};

const fieldPathOf = (payload: Payload, { collectionSlug, key }: LiveRichTextField) => {
  const schemaCache = schemaCacheOf(payload);
  if (!schemaCache) {
    warnOnceOfMissingSchemaCache(payload);
    return null;
  }
  const schema = schemaCache.get(collectionSlug, payload);
  return schema && schemaPathOfRichText(schema, key);
};

const readUnsaved = (payload: Payload, body: unknown, maxStateLength: number): Unsaved | null => {
  if (!isPlainObject(body)) return null;
  const field = readField(body.field);
  const document = field && documentOf(payload, field);
  const fieldPath = document && fieldPathOf(payload, field);
  const state = fieldPath && readPostedEditorState(body.state, maxStateLength);
  if (!field || !document || !fieldPath || !state || !isLocaleOf(payload, body.locale)) return null;
  return { document, field, fieldPath, locale: body.locale, state };
};

const userOf = async (payload: Payload, headers: Headers): Promise<User> =>
  (await payload.auth({ headers })).user;

export const signInAndReadBody = async (
  payload: Payload,
  request: Request,
  { maxStateLength, signal }: PostedReadLimits
): Promise<SignedIn | null> => {
  const user = await userOf(payload, request.headers);
  if (!user || signal.aborted) return null;
  const maxBodyBytes = maxStateLength * MAX_BYTES_PER_CHARACTER + MAX_REQUEST_ENVELOPE_BYTES;
  const body = await readJsonBody(request, maxBodyBytes, signal);
  const unsaved = readUnsaved(payload, body, maxStateLength);
  return unsaved && { unsaved, user };
};

export const checkAndSignIn = async (
  payload: Payload,
  request: unknown,
  headers: Headers | undefined,
  { maxStateLength }: PostedReadLimits
): Promise<SignedIn | null> => {
  const unsaved = readUnsaved(payload, request, maxStateLength);
  const user = unsaved && headers ? await userOf(payload, headers) : null;
  return unsaved && user ? { unsaved, user } : null;
};
