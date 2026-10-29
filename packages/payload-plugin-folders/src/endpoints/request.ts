import { APIError, Forbidden } from "payload";
import type { Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { normalizeFolderReference } from "../core/folderRecords.js";
import type { MoveItemInput, MoveRequest } from "../core/move.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";

export const badRequest = (message: string): APIError => new APIError(message, 400, null, true);

/** Every endpoint of the plugin is for a signed-in user; what the user may do is access control's. */
export const requireUser = (req: PayloadRequest): void => {
  if (!req.user) {
    throw new Forbidden(req.t);
  }
};

export const readJsonBody = async (req: PayloadRequest): Promise<unknown> => {
  if (typeof req.json !== "function") {
    throw badRequest("Send a JSON body");
  }
  try {
    return await req.json();
  } catch {
    throw badRequest("The body is not valid JSON");
  }
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * An id as the collection stores it: a positive whole number (a numeric string from a query string
 * or a form is converted) for number ids, a non-empty string for text ids. Anything else would
 * reach the database as a bad parameter and come back as a 500.
 */
export const parseId = (
  payload: Payload,
  collection: string,
  value: unknown,
  label: string
): FolderId => {
  const idType =
    payload.collections[toCollectionSlug(collection)]?.customIDType ?? payload.db.defaultIDType;
  if (idType === "number") {
    const asNumber = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
    if (typeof asNumber === "number" && Number.isSafeInteger(asNumber) && asNumber > 0) {
      return asNumber;
    }
    throw badRequest(`${label} must be a positive whole number`);
  }
  if (typeof value === "string" && value !== "") {
    return value;
  }
  throw badRequest(`${label} must be a non-empty string`);
};

export const parseItemRef = (
  payload: Payload,
  options: ResolvedOptions,
  value: unknown,
  label: string
): ItemRef => {
  if (!isRecord(value) || typeof value.collection !== "string") {
    throw badRequest(`${label} must be { collection, id }`);
  }
  const { collection } = value;
  if (collection !== options.folders.slug && !options.collections[collection]) {
    throw badRequest(`"${collection}" is not a folder or a page collection of the tree`);
  }

  return { collection, id: parseId(payload, collection, value.id, `${label}.id`) };
};

/** A folder id, or `null` for the top level of the tree. `0` is not a way to say top level. */
export const parseFolderReference = (
  payload: Payload,
  options: ResolvedOptions,
  value: unknown,
  label: string
): FolderId | null => {
  if (value === null) {
    return null;
  }
  if (normalizeFolderReference(value).invalid) {
    throw badRequest(`${label}: use null for the top level of the tree, 0 is not a folder`);
  }

  return parseId(payload, options.folders.slug, value, label);
};

const parseMoveItem = (
  payload: Payload,
  options: ResolvedOptions,
  value: unknown,
  index: number
): MoveItemInput => {
  const label = `items[${index}]`;
  const ref = parseItemRef(payload, options, value, label);
  const { expected } = value as Record<string, unknown>;
  if (expected === undefined) {
    return ref;
  }
  if (!isRecord(expected) || !("parentId" in expected) || !("orderKey" in expected)) {
    throw badRequest(`${label}.expected must be { parentId, orderKey }`);
  }
  if (expected.orderKey !== null && typeof expected.orderKey !== "string") {
    throw badRequest(`${label}.expected.orderKey must be a string or null`);
  }

  return {
    ...ref,
    expected: {
      orderKey: expected.orderKey,
      parentId: parseFolderReference(
        payload,
        options,
        expected.parentId,
        `${label}.expected.parentId`
      ),
    },
  };
};

/**
 * The body of `POST /move` and `POST /move/preview`: `items`, exactly one of `toFolder` (a folder
 * id, or `null` for the top level) and `after` (an item), then optionally `position` (with
 * `toFolder` only) and `redirects`. Shape errors are 400; whether the items and the target still
 * exist is the planner's to answer (a vanished one is a stale 409).
 */
export const parseMoveRequest = (
  payload: Payload,
  options: ResolvedOptions,
  body: unknown
): MoveRequest => {
  if (!isRecord(body)) {
    throw badRequest("Send a JSON object with `items` and `toFolder` or `after`");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw badRequest("Choose at least one item to move");
  }
  const items = body.items.map((item, index) => parseMoveItem(payload, options, item, index));

  const hasToFolder = "toFolder" in body && body.toFolder !== undefined;
  const hasAfter = "after" in body && body.after !== undefined && body.after !== null;
  if (hasToFolder === hasAfter) {
    throw badRequest("Name the target with either `toFolder` or `after`");
  }
  if (body.redirects !== undefined && typeof body.redirects !== "boolean") {
    throw badRequest("`redirects` must be true or false");
  }
  const redirects = body.redirects as boolean | undefined;

  if (hasAfter) {
    if (body.position !== undefined) {
      throw badRequest("`position` goes with `toFolder`, not with `after`");
    }
    const after = parseItemRef(payload, options, body.after, "after");
    if (items.some((item) => item.collection === after.collection && item.id === after.id)) {
      throw badRequest("The item to place the selection after cannot be part of the selection");
    }

    return { after, items, redirects };
  }

  if (body.position !== undefined && body.position !== "start" && body.position !== "end") {
    throw badRequest("`position` must be start or end");
  }

  return {
    items,
    position: body.position as "end" | "start" | undefined,
    redirects,
    toFolder: parseFolderReference(payload, options, body.toFolder, "toFolder"),
  };
};

/** A query-string value that must be a string, such as `parent=root`. */
export const parseQueryString = (value: unknown, label: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw badRequest(`\`${label}\` must be a string`);
  }

  return value;
};

/** `limit`: a whole number of at least 1; larger values are the core function's to cap. */
export const parseLimit = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw badRequest("`limit` must be a whole number of at least 1");
  }

  return parsed;
};

/** `locale`: one of the configured locale codes. */
export const parseLocale = (payload: Payload, value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const codes = payload.config.localization ? payload.config.localization.localeCodes : [];
  if (typeof value !== "string" || !codes.includes(value)) {
    throw badRequest("`locale` is not a configured locale");
  }

  return value;
};

/** A list as `a,b` or `a&...[]`, empty entries dropped. */
export const parseList = (value: unknown, label: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const entries = Array.isArray(value) ? value : [value];
  if (!entries.every((entry) => typeof entry === "string")) {
    throw badRequest(`\`${label}\` must be a list of strings`);
  }

  return entries.flatMap((entry: string) => entry.split(",")).filter((entry) => entry !== "");
};
