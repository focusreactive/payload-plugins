import type { Endpoint, Payload, PayloadRequest, Where } from "payload";

import { docAccessOperation, docAccessOperationGlobal } from "payload";

import type { VeMediaOptions, VeMediaOptionsRequest } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { SignedInRequest } from "./draftField.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { descriptionFieldOf, mediaOptionOf } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";
import { DOCUMENT_NOT_UPDATABLE, draftFieldEndpoint, FIELD_NOT_EDITABLE } from "./draftField.js";
import { shownUploadCollectionOf } from "./editedField.js";

export const MEDIA_PAGE_SIZE = 24;

const MAX_SEARCH_LENGTH = 200;
const FIRST_PAGE = 1;
const LATEST_ID_FIRST = "-id";
const NEWEST_FIRST = ["-createdAt", LATEST_ID_FIRST];

const NOTHING_LISTED: VeMediaOptions = {
  collection: null,
  descriptionField: null,
  documents: [],
  hasNextPage: false,
};

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

const orderOf = (payload: Payload, collection: string): string[] =>
  payload.collections[collection]?.config.timestamps === false ? [LATEST_ID_FIRST] : NEWEST_FIRST;

const IMAGE_TYPES = "image/";

const IMAGES: Where = { mimeType: { contains: IMAGE_TYPES } };

const imagesNamedLike = (search: string): Where =>
  search === "" ? IMAGES : { and: [IMAGES, { filename: { contains: search } }] };

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
  { locale, page, search }: VeMediaOptionsRequest,
  descriptionField: string
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
    where: imagesNamedLike(search),
  });
  const shownDescription = descriptionFieldOf(
    payload.collections[collection]?.config.flattenedFields ?? [],
    descriptionField
  );
  return {
    collection,
    descriptionField: shownDescription,
    documents: found.docs.flatMap((media: unknown) => mediaOptionOf(media, shownDescription) ?? []),
    hasNextPage: found.hasNextPage,
  };
};

export const mediaOptionsEndpoint = (imageDescriptionField: string): Endpoint =>
  draftFieldEndpoint({
    answer: async ({ document, schema, shown }, request, req) => {
      const collection = shownUploadCollectionOf(shown, schema, request.key);
      if (collection === null) return FIELD_NOT_EDITABLE;
      if (!(await mayUpdate(req, document))) return DOCUMENT_NOT_UPDATABLE;
      return listMedia(req, collection, request, imageDescriptionField);
    },
    path: VE_MEDIA_OPTIONS_PATH,
    readAsked: readRequest,
    refusedAnswer: NOTHING_LISTED,
  });
