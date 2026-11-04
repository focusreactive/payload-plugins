import { APIError } from "payload";
import type { CollectionBeforeOperationHook, PayloadRequest } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../core/folderRecords.js";
import { effectiveSegment, getDefaultLocaleKey, requestLocaleKey } from "../core/locales.js";
import type { ValuesByLocale } from "../core/locales.js";
import { readPageRow } from "../core/pageRecords.js";
import { namesOtherFolder, namesOtherOrderKey } from "../core/structureGuard.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { isInternalWrite, slugNotSentContextKey } from "./context.js";

type UpdateArgs = {
  data?: Record<string, unknown>;
  id?: FolderId;
  where?: unknown;
};

type RefusedField = "folder" | "orderKey" | "parent" | "slug" | "structureRevision";

const pageStructureFieldNames = ["folder", "orderKey", "structureRevision"] as const;
const folderStructureFieldNames = ["parent", "orderKey", "structureRevision", "slug"] as const;

const refusalMessages: Record<RefusedField, string> = {
  folder:
    '"folder" cannot be changed through MCP updateDocument. Moving a page changes its live URL in every language, so it goes through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(), which show the URL changes and write redirects. Nothing was saved.',
  orderKey:
    '"orderKey" cannot be changed through MCP updateDocument. The position in the tree is set by a move or a reorder, which go through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(). Nothing was saved.',
  parent:
    '"parent" cannot be changed through MCP updateDocument. Moving a folder changes the live URL of every page beneath it, in every language, so it goes through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(), which show the URL changes and write redirects. Nothing was saved.',
  slug: '"slug" cannot be changed through MCP updateDocument. A folder\'s slug is part of the live URL of every page beneath it, in every language, so a change goes through the admin, which shows which live pages change and offers redirects (or preview it with POST /api/folders-tree/folders/:id/preview). Nothing was saved.',
  structureRevision:
    '"structureRevision" cannot be changed through MCP updateDocument. It counts the moves of a document and is raised only by a move, through the folder tree in the admin, POST /api/folders-tree/move or moveItems(). Nothing was saved.',
};

const refuse = (field: RefusedField): never => {
  throw new APIError(
    refusalMessages[field],
    400,
    {
      field,
      reason: field === "slug" ? "mcp-slug-change" : "mcp-structure-change",
    },
    true
  );
};

/** plugin-mcp sets this on the request of every tool call; Payload's own types do not list it. */
const isMcpRequest = (req: PayloadRequest): boolean =>
  (req.payloadAPI as string | undefined) === "MCP";

/**
 * A page from before the plugin reads back `structureRevision: null` (Payload fills a default only
 * for undefined) while the plugin counts it as 0, so an agent that echoes the doc back sends null.
 * That is the stored value, not a change.
 */
const isSameRevision = (incoming: unknown, stored: number): boolean => {
  if (incoming === null || incoming === undefined) {
    return stored === 0;
  }
  const revision =
    typeof incoming === "number" || typeof incoming === "string" ? Number(incoming) : Number.NaN;

  return revision === stored;
};

const isEmptyText = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

const isSameText = (incoming: unknown, stored: unknown): boolean =>
  incoming === stored || (isEmptyText(incoming) && isEmptyText(stored));

/**
 * Whether a slug in the update's `data` differs from the stored one, read the way the folder's
 * `beforeChange` writes it: a plain string is the request's locale, an object is one value per
 * locale under `locale: "all"`. A locale the object leaves out is not touched. A single-locale
 * read answers the default locale's slug for a locale without its own (fallback), so an agent
 * that copies that value back has changed nothing and passes; `locale: "all"` reads no fallback.
 */
export const slugDiffersFromStored = (
  incoming: unknown,
  stored: ValuesByLocale,
  writeKey: string,
  defaultLocaleKey: string
): boolean => {
  if (writeKey !== "all") {
    return !isSameText(incoming, effectiveSegment(stored, writeKey, defaultLocaleKey));
  }
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return true;
  }

  return Object.entries(incoming as Record<string, unknown>).some(
    ([localeKey, value]) => !isSameText(value, stored[localeKey])
  );
};

/**
 * Update through plugin-mcp (`req.payloadAPI === "MCP"`) that names a structure value different
 * from the stored one. The page's `folder`, `orderKey` and `structureRevision` have `update:
 * nobody` field access, so without this hook Payload drops the value, the stock tool answers
 * "Document updated successfully" and the page has not moved. The admin's full edit form sends
 * the stored structure back, or an old one after a move in another tab, and that stays a silent
 * replace (`structureGuard.ts`), so only MCP is refused. It runs in `beforeOperation`, before any
 * field in the call is written.
 */
export const buildMcpStructureGuard =
  (page: ResolvedPageCollection): CollectionBeforeOperationHook =>
  async ({ args, operation, req }) => {
    const update = args as UpdateArgs;
    if (
      operation !== "update" ||
      !isMcpRequest(req) ||
      isInternalWrite(req) ||
      update.id === undefined ||
      !update.data
    ) {
      return args;
    }
    // An update by `where` on pages is refused by `bulkUpdateGuard` for any API.
    const { data } = update;
    const named = pageStructureFieldNames.filter((name) => data[name] !== undefined);
    if (named.length === 0) {
      return args;
    }

    const stored = await readPageRow(req, page, update.id);
    if (!stored) {
      return args;
    }
    if (
      data.folder !== undefined &&
      namesOtherFolder(normalizeFolderReference(data.folder), stored.folder)
    ) {
      refuse("folder");
    }
    if (data.orderKey !== undefined && namesOtherOrderKey(data.orderKey, stored.orderKey)) {
      refuse("orderKey");
    }
    if (
      data.structureRevision !== undefined &&
      !isSameRevision(data.structureRevision, stored.structureRevision)
    ) {
      refuse("structureRevision");
    }

    return args;
  };

/**
 * The folders collection's counterpart of `buildMcpStructureGuard`: `parent`, `orderKey`,
 * `structureRevision` and every `slug` change are refused. A name-only change passes. A `where`
 * update that names any of the four is refused, because it has no single stored value to compare
 * with and the folder bulk guard does not cover `parent`.
 */
export const buildFolderMcpStructureGuard =
  (options: ResolvedOptions): CollectionBeforeOperationHook =>
  async ({ args, operation, req }) => {
    const update = args as UpdateArgs;
    if (operation !== "update" || !isMcpRequest(req) || isInternalWrite(req) || !update.data) {
      return args;
    }
    const { data } = update;
    const named = folderStructureFieldNames.filter((name) => data[name] !== undefined);
    if (named.length === 0) {
      return args;
    }
    if (update.id === undefined) {
      return refuse(named[0]);
    }

    const stored = await readFolderRecord(req, options, update.id);
    if (!stored) {
      return args;
    }
    if (
      data.parent !== undefined &&
      namesOtherFolder(normalizeFolderReference(data.parent), stored.parent)
    ) {
      refuse("parent");
    }
    if (data.orderKey !== undefined && namesOtherOrderKey(data.orderKey, stored.orderKey)) {
      refuse("orderKey");
    }
    if (
      data.structureRevision !== undefined &&
      !isSameRevision(data.structureRevision, stored.structureRevision)
    ) {
      refuse("structureRevision");
    }
    if (data.slug !== undefined) {
      const writeKey = requestLocaleKey(req.payload, options, req.locale);
      const defaultLocaleKey = getDefaultLocaleKey(req.payload, options);
      if (slugDiffersFromStored(data.slug, stored.slug, writeKey, defaultLocaleKey)) {
        refuse("slug");
      }
      // The agent read the default locale's slug as this locale's by fallback and sent it back.
      // Left in the update, the folder's `beforeChange` would store it as this locale's own and
      // detach the locale from every later change to the default slug.
      if (
        writeKey !== "all" &&
        writeKey !== defaultLocaleKey &&
        data.slug &&
        !stored.slug[writeKey]
      ) {
        delete data.slug;
        req.context[slugNotSentContextKey] = true;
      }
    }

    return args;
  };
