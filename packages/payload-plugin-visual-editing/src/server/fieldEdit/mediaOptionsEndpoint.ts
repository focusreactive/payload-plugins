import type { Endpoint, Payload, PayloadRequest, Where } from "payload";

import { docAccessOperation, docAccessOperationGlobal, headersWithCors } from "payload";

import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { VeMediaOptions, VeMediaOptionsRequest } from "../../shared/protocol.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";
import type { User } from "./draftField.js";

import { readEditedField, REQUEST_UNREADABLE } from "../../shared/fieldEdit.js";
import { mediaOptionOf } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";
import { jsonBodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  draftFieldOf,
  inLocaleOfProject,
  FIELD_NOT_EDITABLE,
  FORBIDDEN,
  isRefusal,
  refusalOfStatus,
  SIGNED_OUT,
  statusOfFailure,
  UNREADABLE_REQUEST,
} from "./draftField.js";
import { shownUploadCollectionOf } from "./editedField.js";

export const MEDIA_PAGE_SIZE = 24;

const MAX_SEARCH_LENGTH = 200;
const FIRST_PAGE = 1;
const LATEST_ID_FIRST = "-id";
const NEWEST_FIRST = ["-createdAt", LATEST_ID_FIRST];
const DESCRIPTION_FIELD = "alt";
const DESCRIPTION_FIELD_TYPE = "text";

const NOTHING_LISTED: VeMediaOptions = { collection: null, documents: [], hasNextPage: false };

const answer = (options: object, status: number, req: PayloadRequest): Response =>
  Response.json(options, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });

const refuse = (
  status: number,
  req: PayloadRequest,
  reason: SaveRefusal = refusalOfStatus(status)
): Response => answer({ ...NOTHING_LISTED, reason }, status, req);

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
  payload: Payload,
  user: User,
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

export const mediaOptionsEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return refuse(SIGNED_OUT, req);

    const posted = readRequest(await jsonBodyOf(req));
    if (!posted) return refuse(UNREADABLE_REQUEST, req, REQUEST_UNREADABLE);
    const request = inLocaleOfProject(payload, posted);

    try {
      const field = await draftFieldOf(payload, user, request);
      if (isRefusal(field)) return refuse(field.status, req);

      const collection = shownUploadCollectionOf(field.shown, field.schema, request.key);
      if (collection === null) return refuse(FIELD_NOT_EDITABLE, req);
      if (!(await mayUpdate(req, field.document))) return refuse(FORBIDDEN, req);

      return answer(await listMedia(payload, user, collection, request), ANSWERED, req);
    } catch (error) {
      return refuse(statusOfFailure(error), req);
    }
  },
  method: "post",
  path: VE_MEDIA_OPTIONS_PATH,
};
