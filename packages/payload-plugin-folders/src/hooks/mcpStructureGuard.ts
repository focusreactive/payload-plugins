import { APIError } from "payload";
import type { CollectionBeforeOperationHook, PayloadRequest } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../core/folderRecords.js";
import { effectiveSegment, getDefaultLocaleKey, requestLocaleKey } from "../core/locales.js";
import type { ValuesByLocale } from "../core/locales.js";
import { readPageRow } from "../core/pageRecords.js";
import {
  classifyStructureEdit,
  coerceRevision,
  isEmptyText,
  namesOtherFolder,
  namesOtherOrderKey,
} from "../core/structureGuard.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { isInternalWrite, mcpRenameConfirmedContextKey, slugNotSentContextKey } from "./context.js";
import { pageStructureFieldNames } from "../constants.js";

type UpdateArgs = {
  data?: Record<string, unknown>;
  id?: FolderId;
  overrideAccess?: boolean;
  where?: unknown;
};

type RefusedField = "folder" | "orderKey" | "parent" | "slug" | "structureRevision";

const folderStructureFieldNames = ["parent", "orderKey", "structureRevision", "slug"] as const;
/** The names a plain update is refused for: a slug rename through REST is allowed. */
const folderStructureFieldNamesWithoutSlug = ["parent", "orderKey", "structureRevision"] as const;

/** What the caller should do instead, per field; `refuse` puts the channel in front. */
const refusalAdvice: Record<RefusedField, string> = {
  folder:
    "Moving a page changes its live URL in every language, so it goes through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(), which show the URL changes and write redirects. Nothing was saved.",
  orderKey:
    "The position in the tree is set by a move or a reorder, which go through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(). Nothing was saved.",
  parent:
    "Moving a folder changes the live URL of every page beneath it, in every language, so it goes through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST /api/folders-tree/move/preview) or moveItems(), which show the URL changes and write redirects. Nothing was saved.",
  slug: "A folder's slug is part of the live URL of every page beneath it, in every language, so a change goes through the admin, which shows which live pages change and offers redirects (or preview it with POST /api/folders-tree/folders/:id/preview). Nothing was saved.",
  structureRevision:
    "It counts the moves of a document and is raised only by a move, through the folder tree in the admin, POST /api/folders-tree/move or moveItems(). Nothing was saved.",
};

/** Who sent the update: the stock MCP tool, or any other caller whose field access drops structure values. */
type RefusalChannel = "api" | "mcp";

const channelPhrases: Record<RefusalChannel, string> = {
  api: "by updating the document",
  mcp: "through MCP updateDocument",
};

const refuse = (field: RefusedField, channel: RefusalChannel): never => {
  throw new APIError(
    `"${field}" cannot be changed ${channelPhrases[channel]}. ${refusalAdvice[field]}`,
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
  return coerceRevision(incoming) === stored;
};

type StoredStructure = {
  orderKey: string | null;
  structureRevision: number;
} & Partial<Record<"folder" | "parent", FolderId | null>>;

/**
 * The MCP rule: refuses any structure value in `data` that differs from the stored row, whatever
 * revision comes with it; `parentFieldName` is the field that holds the parent folder.
 */
const refuseChangedStructure = (
  data: Record<string, unknown>,
  stored: StoredStructure,
  parentFieldName: "folder" | "parent"
): void => {
  if (
    data[parentFieldName] !== undefined &&
    namesOtherFolder(
      normalizeFolderReference(data[parentFieldName]),
      stored[parentFieldName] ?? null
    )
  ) {
    refuse(parentFieldName, "mcp");
  }
  if (data.orderKey !== undefined && namesOtherOrderKey(data.orderKey, stored.orderKey)) {
    refuse("orderKey", "mcp");
  }
  if (
    data.structureRevision !== undefined &&
    !isSameRevision(data.structureRevision, stored.structureRevision)
  ) {
    refuse("structureRevision", "mcp");
  }
};

/**
 * The rule for every other caller whose field access drops the structure fields: refuses what the
 * collection's `beforeChange` would call a deliberate edit had the value reached it, which is a
 * different parent or orderKey that carries no revision or one that is not older than the stored
 * one. An older revision is a stale replay (the admin's form or autosave loaded before a move),
 * and stays a silent replace there. A request that names no revision cannot be one: the admin's
 * form always sends the revision with the structure, while a script sends none. A null revision
 * is the stored 0 of a page from before the plugin, so it counts as the oldest revision.
 */
const refuseDeliberateStructure = (
  data: Record<string, unknown>,
  stored: StoredStructure,
  parentFieldName: "folder" | "parent"
): void => {
  const requestedParent =
    data[parentFieldName] === undefined ? null : normalizeFolderReference(data[parentFieldName]);
  const changesParent =
    requestedParent !== null && namesOtherFolder(requestedParent, stored[parentFieldName] ?? null);
  const changesOrderKey = namesOtherOrderKey(data.orderKey, stored.orderKey);
  const edit = classifyStructureEdit({
    changesStructure: changesParent || changesOrderKey,
    incomingRevision: data.structureRevision === null ? 0 : data.structureRevision,
    missingRevisionIsStale: false,
    storedRevision: stored.structureRevision,
  });
  if (edit === "deliberate") {
    refuse(changesParent ? parentFieldName : "orderKey", "api");
  }
};

/**
 * Whether the update reaches this guard at all: the stock MCP tool, or any call that runs field
 * access. `overrideAccess: true` is a host's server code, trusted to know what it does: its
 * structure values reach the collection's `beforeChange` guard, which has its own rule.
 */
const isGuardedCaller = (req: PayloadRequest, update: UpdateArgs): boolean =>
  !isInternalWrite(req) && (isMcpRequest(req) || update.overrideAccess !== true);

const refuseStructureEdit = (
  req: PayloadRequest,
  data: Record<string, unknown>,
  stored: StoredStructure,
  parentFieldName: "folder" | "parent"
): void => {
  if (isMcpRequest(req)) {
    refuseChangedStructure(data, stored, parentFieldName);
  } else {
    refuseDeliberateStructure(data, stored, parentFieldName);
  }
};

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
 * Update that names a page's `folder`, `orderKey` or `structureRevision` and would lose it. These
 * fields have `update: nobody` field access, so without this hook Payload drops the value, answers
 * 200 and the page has not moved. Through plugin-mcp (`req.payloadAPI === "MCP"`) any value
 * different from the stored one is refused. Any other caller that runs field access (REST,
 * GraphQL, a host's own MCP tool, the Local API with `overrideAccess: false`) is refused only for
 * a deliberate edit (`refuseDeliberateStructure`), because the admin's full edit form and autosave
 * send the stored structure back, or an old one after a move in another tab, and that stays a
 * silent replace (`structureGuard.ts`). It runs in `beforeOperation`, before any field in the call
 * is written.
 */
export const buildMcpStructureGuard =
  (page: ResolvedPageCollection): CollectionBeforeOperationHook =>
  async ({ args, operation, req }) => {
    const update = args as UpdateArgs;
    if (
      operation !== "update" ||
      !isGuardedCaller(req, update) ||
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
    refuseStructureEdit(req, data, stored, "folder");

    return args;
  };

/**
 * The folders collection's counterpart of `buildMcpStructureGuard`. Through MCP `parent`,
 * `orderKey`, `structureRevision` and every `slug` change are refused, and a name-only change
 * passes. Any other caller whose field access drops the structure is refused for a deliberate
 * `parent` or `orderKey` edit only; a `slug` change stays allowed there, because a REST save is
 * the documented way to rename a folder and runs the subtree rewrite. A `where` update that names
 * a guarded field is refused, because it has no single stored value to compare with and the folder
 * bulk guard does not cover `parent`.
 */
export const buildFolderMcpStructureGuard =
  (options: ResolvedOptions): CollectionBeforeOperationHook =>
  async ({ args, operation, req }) => {
    const update = args as UpdateArgs;
    if (operation !== "update" || !isGuardedCaller(req, update) || !update.data) {
      return args;
    }
    const { data } = update;
    const isMcp = isMcpRequest(req);
    const named = (isMcp ? folderStructureFieldNames : folderStructureFieldNamesWithoutSlug).filter(
      (name) => data[name] !== undefined
    );
    if (named.length === 0) {
      return args;
    }
    if (update.id === undefined) {
      return refuse(named[0], isMcp ? "mcp" : "api");
    }

    const stored = await readFolderRecord(req, options, update.id);
    if (!stored) {
      return args;
    }
    refuseStructureEdit(req, data, stored, "parent");
    const isConfirmedRename = req.context?.[mcpRenameConfirmedContextKey] === String(update.id);
    if (isMcp && data.slug !== undefined && !isConfirmedRename) {
      const writeKey = requestLocaleKey(req.payload, options, req.locale);
      const defaultLocaleKey = getDefaultLocaleKey(req.payload, options);
      if (slugDiffersFromStored(data.slug, stored.slug, writeKey, defaultLocaleKey)) {
        refuse("slug", "mcp");
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
