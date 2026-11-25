import type { Endpoint, Payload, PayloadRequest, Where } from "payload";

import { docAccessOperation, docAccessOperationGlobal } from "payload";

import type { VeMediaOptions, VeMediaOptionsRequest } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { SignedInRequest } from "./draftField.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { mediaOptionOf } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";
import { DOCUMENT_NOT_UPDATABLE, draftFieldEndpoint, FIELD_NOT_EDITABLE } from "./draftField.js";
import { shownUploadCollectionOf } from "./editedField.js";

export const MEDIA_PAGE_SIZE = 24;

const MAX_SEARCH_LENGTH = 200;
const FIRST_PAGE = 1;
const LATEST_ID_FIRST = "-id";
const NEWEST_FIRST = ["-createdAt", LATEST_ID_FIRST];
const DESCRIPTION_FIELD = "alt";
const DESCRIPTION_FIELD_TYPE = "text";

const NOTHING_LISTED: VeMediaOptions = { collection: null, documents: [], hasNextPage: false };

const isPageNumber = (page: unknown): page is number =>
  typeof page === "number" && Number.isSafeInteger(page) && page >= FIRST_PAGE;

const isSearch = (search: unknown): search is string =>
  typeof search === "string" && search.length <= MAX_SEARCH_LENGTH;

const readRequest = (body: unknown): VeMediaOptionsRequest | null => {
  const field = readEditedField(body);
  if (!field || !isPlainObject(body)) return null;
  const { page, search } = body;
  return isPageNumber(page) && isSearch(search) ? { ...field, page, search } : null;
};

const describesItsFiles = (payload: Payload, collection: string): boolean =>
  Boolean(
    payload.collections[collection]?.config.flattenedFields.some(
      (field) => field.name === DESCRIPTION_FIELD && field.type === DESCRIPTION_FIELD_TYPE
    )
  );

const orderOf = (payload: Payload, collection: string): string[] =>
  payload.collections[collection]?.config.timestamps === false ? [LATEST_ID_FIRST] : NEWEST_FIRST;

const filesNamedLike = (search: string): Where | undefined =>
  search === "" ? undefined : { filename: { contains: search } };

const mayUpdate = async (req: PayloadRequest, document: DocumentToRead): Promise<boolean> => {
  if (document.kind === "collection") {
    const collection = req.payload.collections[document.collection];
    return Boolean(
      collection && (await docAccessOperation({ collection, id: document.id, req })).update
    );
  }
  const globalConfig = req.payload.config.globals.find(({ slug }) => slug === document.slug);
  return Boolean(globalConfig && (await docAccessOperationGlobal({ globalConfig, req })).update);
};

const listMedia = async (
  { payload, user }: SignedInRequest,
  collection: string,
  { locale, page, search }: VeMediaOptionsRequest
): Promise<VeMediaOptions> => {
  const found = await payload.find({
    collection,
    context: { visualEditing: false },
    depth: 0,
    limit: MEDIA_PAGE_SIZE,
    locale,
    overrideAccess: false,
    page,
    sort: orderOf(payload, collection),
    user,
    where: filesNamedLike(search),
  });
  const hasDescription = describesItsFiles(payload, collection);
  return {
    collection,
    documents: found.docs.flatMap((media: unknown) => mediaOptionOf(media, hasDescription) ?? []),
    hasNextPage: found.hasNextPage,
  };
};

export const mediaOptionsEndpoint: Endpoint = draftFieldEndpoint({
  answer: async ({ document, schema, shown }, request, req) => {
    const collection = shownUploadCollectionOf(shown, schema, request.key);
    if (collection === null) return FIELD_NOT_EDITABLE;
    if (!(await mayUpdate(req, document))) return DOCUMENT_NOT_UPDATABLE;
    return listMedia(req, collection, request);
  },
  path: VE_MEDIA_OPTIONS_PATH,
  readAsked: readRequest,
  refusedAnswer: NOTHING_LISTED,
});
