import type { Endpoint, Payload, PayloadRequest, Where } from "payload";

import { headersWithCors } from "payload";

import type { VeMediaOptions, VeMediaOptionsRequest } from "../../shared/protocol.js";
import type { User } from "./draftField.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { mediaOptionOf } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";
import { bodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  draftFieldOf,
  inLocaleOfProject,
  FIELD_NOT_EDITABLE,
  isRefusal,
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

const answer = (options: VeMediaOptions, status: number, req: PayloadRequest): Response =>
  Response.json(options, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });

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
    if (!user) return answer(NOTHING_LISTED, SIGNED_OUT, req);

    const posted = readRequest(await bodyOf(req));
    if (!posted) return answer(NOTHING_LISTED, UNREADABLE_REQUEST, req);
    const request = inLocaleOfProject(payload, posted);

    const field = await draftFieldOf(payload, user, request);
    if (isRefusal(field)) return answer(NOTHING_LISTED, field.status, req);

    const collection = shownUploadCollectionOf(field.shown, field.schema, request.key);
    if (collection === null) return answer(NOTHING_LISTED, FIELD_NOT_EDITABLE, req);

    try {
      return answer(await listMedia(payload, user, collection, request), ANSWERED, req);
    } catch (error) {
      return answer(NOTHING_LISTED, statusOfFailure(error), req);
    }
  },
  method: "post",
  path: VE_MEDIA_OPTIONS_PATH,
};
