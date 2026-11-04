import { APIError, createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, PathChange, ResolvedOptions } from "../types.js";
import {
  canReadItem,
  findRefusedChecks,
  findUnreadableItems,
  keepReadableItems,
} from "./access.js";
import type { AccessCheck } from "./access.js";
import { findFirstChild } from "../hooks/folders/deleteHooks.js";
import { queueAfterPathChange } from "./afterPathChange.js";
import { deleteChangesContextKey } from "./deletedPaths.js";
import { readFolderRecord } from "./folderRecords.js";
import { getDefaultLocaleKey, getFallbackLocaleKey } from "./locales.js";
import { createNestedRequest } from "./nestedRequest.js";
import { registerOperationHandler, runOrQueue, skippedUnitsStateKey } from "./operations.js";
import type { OperationHandler, OperationSkip } from "./operations.js";
import { pagePathIn } from "./pagePaths.js";
import { effectiveSegmentsOf, liveLocaleKeysOf } from "./pageRecords.js";
import { getResolvedOptions } from "./runtime.js";
import { itemKey } from "./itemKey.js";
import { readSelection } from "./selection.js";
import type { Selection } from "./selection.js";
import { readLatestStatuses, resolveTreeStatus } from "./status.js";
import {
  createConflictNamer,
  getPageDefaultLocale,
  getPageLocaleKeys,
  readTitle,
} from "./uniqueness.js";

/** Above this many pages a delete asks for a typed word (spec section 7.10). */
export const confirmAbovePages = 10;

/** The word a mixed selection asks for; a single folder asks for its own segment. */
export const mixedConfirmWord = "delete";

const sampleSize = 50;

export type DeleteRequest = {
  /** The word `previewDelete` asked for, when it asked for one. */
  confirmWord?: string;
  items: ItemRef[];
};

export type DeletePreview = {
  /** The word to type above 10 pages: the folder's segment, or `delete` for a mixed selection. */
  confirmWord: string | null;
  /** Folders that go, subfolders included. */
  folders: number;
  /**
   * How many of `folders` and `pages` already sit in the trash. Only a permanent delete takes them
   * along; a soft one leaves them where they are and counts none.
   */
  inTrash: number;
  /** Pages that go. */
  pages: number;
  /** Page URLs that stop working: one per locale a page is live in. */
  publishedUrls: number;
  /** The first 50 paths that go, each with the status of a page. */
  sample: string[];
  /** True when the delete is soft: everything goes to the trash. */
  trash: boolean;
};

export type DeleteResult =
  | {
      deleted: number;
      /** Folders left in place because they gained content after the delete was planned. */
      skipped?: OperationSkip[];
      trashed: number;
    }
  | { operationId: FolderId; total: number };

export type DeleteBlockReason = "confirm" | "forbidden";

/** A delete the checks of spec sections 7.10 and 9 refused. Nothing was written. */
export class DeleteBlockedError extends APIError<{
  confirmWord?: string;
  /** Every refused document, however many `items` lists. */
  count: number;
  /** The first 50 of them. */
  items: ItemRef[];
  reason: DeleteBlockReason;
}> {
  constructor({
    confirmWord,
    count,
    items = [],
    message,
    reason,
  }: {
    confirmWord?: string;
    /** Default: the length of `items`. A caller that leaves unreadable items out passes the full count. */
    count?: number;
    items?: ItemRef[];
    message: string;
    reason: DeleteBlockReason;
  }) {
    super(
      message,
      reason === "forbidden" ? 403 : 400,
      {
        ...(confirmWord === undefined ? {} : { confirmWord }),
        count: count ?? items.length,
        items: items.slice(0, 50),
        reason,
      },
      true
    );
    this.name = "DeleteBlockedError";
  }
}

type DeleteUnit = { collection: string; id: FolderId };

export type DeletePlan = {
  confirmWord: string | null;
  folders: number;
  inTrash: number;
  isSoft: boolean;
  pages: number;
  selection: Selection;
  units: DeleteUnit[];
};

/** Soft when the folders and every opted-in page collection have `trash` (spec section 7.10). */
const isTrashEnabled = (payload: Payload, options: ResolvedOptions): boolean =>
  options.folders.trash &&
  Boolean(payload.collections[toCollectionSlug(options.folders.slug)]?.config.trash);

/**
 * The documents a delete removes, in the order it removes them: every page first, then the folders
 * from the deepest up, so a folder is empty when its own turn comes (the folder's `beforeDelete`
 * refuses a folder that is not).
 */
const orderUnits = (selection: Selection, options: ResolvedOptions): DeleteUnit[] => [
  ...selection.pages.map((page) => ({ collection: page.collection, id: page.id })),
  ...[...selection.folders]
    .sort((left, right) => (right.depth ?? 0) - (left.depth ?? 0))
    .map((folder) => ({ collection: options.folders.slug, id: folder.id })),
];

const confirmWordOf = (
  selection: Selection,
  options: ResolvedOptions,
  payload: Payload
): string | null => {
  if (selection.pages.length <= confirmAbovePages) {
    return null;
  }
  const [only] = selection.roots;
  if (selection.roots.length === 1 && only.collection === options.folders.slug) {
    const folder = selection.folders.find((candidate) => String(candidate.id) === String(only.id));
    const segment = folder?.slug[getDefaultLocaleKey(payload, options)];
    if (segment) {
      return segment;
    }
  }

  return mixedConfirmWord;
};

/**
 * Asks the collection's `delete` access (and, for a soft delete, `update` with `deletedAt`, which
 * Payload asks of a move to the trash) about everything the delete removes, once per collection.
 * A collection that refuses is then asked per document, so the refusal can name them.
 */
const findRefusedItems = async ({
  isSoft,
  req,
  units,
}: {
  isSoft: boolean;
  req: PayloadRequest;
  units: DeleteUnit[];
}): Promise<ItemRef[]> => {
  const idsByCollection = new Map<string, FolderId[]>();
  for (const unit of units) {
    idsByCollection.set(unit.collection, [
      ...(idsByCollection.get(unit.collection) ?? []),
      unit.id,
    ]);
  }
  const deletedAt = new Date().toISOString();
  const operations: Array<{ data?: Record<string, unknown>; operation: "delete" | "update" }> = [
    { operation: "delete" },
    ...(isSoft ? [{ data: { deletedAt }, operation: "update" as const }] : []),
  ];

  const refused: ItemRef[] = [];
  for (const [collection, ids] of idsByCollection) {
    const grouped: AccessCheck[] = operations.map(({ data, operation }) => ({
      collection,
      data,
      group: { ids, scope: { id: { in: ids } } },
      key: `${operation}:${collection}`,
      operation,
    }));
    if ((await findRefusedChecks({ checks: grouped, req })).size === 0) {
      continue;
    }
    // Every document is asked, because the refusal states how many it is about.
    const perDocument = ids.flatMap((id) =>
      operations.map(
        ({ data, operation }): AccessCheck => ({
          collection,
          data,
          id,
          key: `${operation}:${id}`,
          operation,
        })
      )
    );
    const refusedKeys = await findRefusedChecks({ checks: perDocument, req });
    const refusedIds = ids.filter((id) =>
      operations.some(({ operation }) => refusedKeys.has(`${operation}:${id}`))
    );
    refused.push(...(refusedIds.length > 0 ? refusedIds : ids).map((id) => ({ collection, id })));
  }

  return refused;
};

const assertDeletableItems = (request: DeleteRequest, options: ResolvedOptions): void => {
  if (request.items.length === 0) {
    throw new APIError("Choose at least one item to delete", 400, null, true);
  }
  if (request.items.length > options.limits.maxItemsPerOperation) {
    throw new APIError(
      `Delete at most ${options.limits.maxItemsPerOperation} items at once`,
      400,
      null,
      true
    );
  }
  for (const item of request.items) {
    if (item.collection !== options.folders.slug && !options.collections[item.collection]) {
      throw new APIError(
        `"${item.collection}" is not a folder or a page collection of the tree`,
        400,
        null,
        true
      );
    }
  }
};

/**
 * What a delete of `items` removes (spec sections 7.10 and 9), with nothing written: every folder and
 * page beneath a selected folder, ordered for removal. Unless `overrideAccess` is true the user needs
 * `delete` access on every one of them, and a refusal aborts the whole delete with a
 * `DeleteBlockedError` that lists the refused items (references only, no title).
 */
export const planDelete = async (
  req: PayloadRequest,
  request: DeleteRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<DeletePlan> => {
  const { payload } = req;
  assertDeletableItems(request, options);

  // A permanent delete takes the trashed content of the folders along: the folder's own
  // `beforeDelete` refuses a folder that anything, trashed or not, still points at. This is the
  // case when only some of the page collections have a trash.
  const isSoft = isTrashEnabled(payload, options);
  const selection = await readSelection(req, options, request.items, { includeTrashed: !isSoft });
  const units = orderUnits(selection, options);

  if (!overrideAccess && units.length > 0) {
    const refused = await findRefusedItems({ isSoft, req, units });
    if (refused.length > 0) {
      // The count is every refused document; the list leaves out the ones the user may not read.
      throw new DeleteBlockedError({
        count: refused.length,
        items: await keepReadableItems({ items: refused, req }),
        message: "You are not allowed to delete everything in this selection",
        reason: "forbidden",
      });
    }
  }

  return {
    confirmWord: confirmWordOf(selection, options, payload),
    folders: selection.folders.length,
    inTrash:
      selection.pages.filter((page) => page.isTrashed).length +
      selection.folders.filter((folder) => Boolean(folder.storedRow.deletedAt)).length,
    isSoft,
    pages: selection.pages.length,
    selection,
    units,
  };
};

const countPublishedUrls = (selection: Selection, payload: Payload): number => {
  const localeKeys = getPageLocaleKeys(payload);
  const fallbackKey = getFallbackLocaleKey(payload);
  let total = 0;
  for (const page of selection.pages) {
    if (page.isTrashed) {
      continue;
    }
    const hasDrafts = Boolean(
      payload.collections[toCollectionSlug(page.collection)]?.config.versions?.drafts
    );
    total += liveLocaleKeysOf(page.row.status, localeKeys, hasDrafts, fallbackKey).length;
  }

  return total;
};

/** The first paths that go, folders and pages, each page with its status; only what the user may read. */
const buildSample = async ({
  options,
  overrideAccess,
  req,
  selection,
}: {
  options: ResolvedOptions;
  overrideAccess: boolean;
  req: PayloadRequest;
  selection: Selection;
}): Promise<string[]> => {
  const { payload } = req;
  const key = getPageDefaultLocale(payload);
  const folderById = new Map(selection.folders.map((folder) => [String(folder.id), folder]));
  const pathOfFolder = (folder: Selection["folders"][number]): string =>
    folder.fullPath[getDefaultLocaleKey(payload, options)] || "";

  type Entry = { collection: string; id: FolderId; path: string };
  const entries: Entry[] = [
    ...selection.folders.map((folder) => ({
      collection: options.folders.slug,
      id: folder.id,
      path: pathOfFolder(folder),
    })),
    ...selection.pages.flatMap((page): Entry[] => {
      const folder = folderById.get(String(page.row.folder));
      const path = pagePathIn({
        folder: folder ?? null,
        isFolderRoot: page.row.isFolderRoot,
        key,
        options,
        payload,
        segment: effectiveSegmentsOf(page.row, [key], key)[key],
      });

      return [{ collection: page.collection, id: page.id, path: path ?? "(no URL yet)" }];
    }),
  ].sort((left, right) => left.path.localeCompare(right.path));

  const candidates = entries.slice(0, sampleSize * 4);
  const unreadable = overrideAccess
    ? []
    : await findUnreadableItems({
        items: candidates.map((entry) => ({ collection: entry.collection, id: entry.id })),
        req,
      });
  const hidden = new Set(unreadable.map((item) => itemKey(item)));
  const shown = candidates.filter((entry) => !hidden.has(itemKey(entry))).slice(0, sampleSize);

  const fallbackKey = getFallbackLocaleKey(payload);
  const latestByCollection = new Map<string, Map<string, unknown>>();
  for (const page of Object.values(options.collections)) {
    if (payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts) {
      latestByCollection.set(
        page.slug,
        await readLatestStatuses({
          collection: page.slug,
          ids: shown.filter((entry) => entry.collection === page.slug).map((entry) => entry.id),
          req,
        })
      );
    }
  }
  const pageByKey = new Map(selection.pages.map((page) => [itemKey(page), page]));

  return shown.map((entry) => {
    const page = pageByKey.get(itemKey(entry));
    if (!page) {
      return `${entry.path} (folder)`;
    }
    const status = resolveTreeStatus({
      fallbackKey,
      hasDrafts: latestByCollection.has(entry.collection),
      key,
      latestStatus: latestByCollection.get(entry.collection)?.get(String(entry.id)),
      mainStatus: page.row.status,
    });

    return `${entry.path} (${status})`;
  });
};

/** The counts and the word a delete dialog shows before it asks (spec section 10.2). */
export const previewDelete = async (
  req: PayloadRequest,
  request: DeleteRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<DeletePreview> => {
  const { payload } = req;
  assertDeletableItems(request, options);
  // An item the user may not read answers as a missing one does, so a preview never tells the
  // counts or the confirm word of a folder the user cannot see.
  const unreadable = new Set(
    overrideAccess
      ? []
      : (await findUnreadableItems({ items: request.items, req })).map((item) => itemKey(item))
  );
  const items = request.items.filter((item) => !unreadable.has(itemKey(item)));
  if (items.length === 0) {
    return {
      confirmWord: null,
      folders: 0,
      inTrash: 0,
      pages: 0,
      publishedUrls: 0,
      sample: [],
      trash: isTrashEnabled(payload, options),
    };
  }
  const plan = await planDelete(req, { ...request, items }, { options, overrideAccess: true });

  return {
    confirmWord: plan.confirmWord,
    folders: plan.folders,
    inTrash: plan.inTrash,
    pages: plan.pages,
    publishedUrls: countPublishedUrls(plan.selection, payload),
    sample: await buildSample({ options, overrideAccess, req, selection: plan.selection }),
    trash: plan.isSoft,
  };
};

/**
 * What a skipped folder's message calls its new child: the page's title or the subfolder's name
 * when the caller may read it, nothing otherwise. A system call (`overrideAccess`) reads everything.
 */
const nameNewChild = async ({
  child,
  nameConflictingPage,
  options,
  overrideAccess,
  req,
}: {
  child: ItemRef;
  nameConflictingPage: ReturnType<typeof createConflictNamer>;
  options: ResolvedOptions;
  overrideAccess: boolean;
  req: PayloadRequest;
}): Promise<string | null> => {
  const { payload } = req;
  if (child.collection === options.folders.slug) {
    if (!overrideAccess && !(await canReadItem({ item: child, req }))) {
      return null;
    }
    const folder = await readFolderRecord(req, options, child.id);
    const key = getDefaultLocaleKey(payload, options);

    return folder ? folder.name[key] || folder.slug[key] || null : null;
  }
  const page = options.collections[child.collection];
  if (!page) {
    return null;
  }
  const title = await readTitle(req, page, child.id, getPageDefaultLocale(payload));

  return overrideAccess
    ? title
    : nameConflictingPage({
        collection: child.collection,
        id: child.id,
        kind: "page",
        path: "",
        title,
      });
};

/**
 * The step of a delete: each unit is removed through Payload (`delete`, or an update that sets
 * `deletedAt` when the trash is on), so the collections' own hooks run: a page's redirect rows go
 * and its URLs are collected for `hooks.afterPathChange`, and a folder is deleted empty. Pages come
 * first and folders deepest first, so nothing is left behind. A unit that is already gone is passed
 * over, so a retried or repeated step removes nothing twice. A folder that holds something when its
 * turn comes gained it after the work list was made: the user never confirmed deleting it, so the
 * folder stays, is listed in the state's skipped units, and the operation goes on instead of
 * answering the folder guard's 409 on every retry. The URLs of the whole step are
 * reported once, with reason `delete`, after the step commits.
 */
const deleteHandler: OperationHandler = {
  run: async ({ options, params, req, state }, units) => {
    const isSoft = params.isSoft === true;
    const overrideAccess = params.overrideAccess === true;
    const collected: PathChange[] = [];
    req.context = { ...req.context, [deleteChangesContextKey]: collected };
    let deleted = typeof state.deleted === "number" ? state.deleted : 0;
    let trashed = typeof state.trashed === "number" ? state.trashed : 0;
    let skipped = typeof state.skipped === "number" ? state.skipped : 0;
    const skippedFolders: OperationSkip[] = Array.isArray(state[skippedUnitsStateKey])
      ? [...(state[skippedUnitsStateKey] as OperationSkip[])]
      : [];
    const nameConflictingPage = createConflictNamer(req);

    try {
      for (const unit of units as DeleteUnit[]) {
        const config = req.payload.collections[toCollectionSlug(unit.collection)]?.config;
        const stored = (await req.payload.db.findOne({
          collection: toCollectionSlug(unit.collection),
          req,
          select: (config?.trash ? { deletedAt: true } : { id: true }) as never,
          where: { id: { equals: unit.id } },
        })) as { deletedAt?: string | null } | null;
        // A permanent delete also removes what is already in the trash; a soft one has nothing to
        // do with it.
        if (!stored || (isSoft && stored.deletedAt)) {
          skipped += 1;
          continue;
        }
        if (unit.collection === options.folders.slug) {
          const newChild = await findFirstChild({
            folderId: unit.id,
            includeTrashed: !isSoft,
            options,
            req,
          });
          if (newChild) {
            const folder = await readFolderRecord(req, options, unit.id);
            skippedFolders.push({
              child: await nameNewChild({
                child: newChild,
                nameConflictingPage,
                options,
                overrideAccess,
                req,
              }),
              path: folder?.fullPath[getDefaultLocaleKey(req.payload, options)] ?? "",
              reason: "notEmpty",
            });
            continue;
          }
        }
        if (isSoft) {
          await req.payload.update({
            collection: toCollectionSlug(unit.collection),
            data: { deletedAt: new Date().toISOString() } as never,
            depth: 0,
            id: unit.id,
            overrideAccess,
            req: createNestedRequest(req),
          });
          trashed += 1;
        } else {
          await req.payload.delete({
            collection: toCollectionSlug(unit.collection),
            depth: 0,
            id: unit.id,
            overrideAccess,
            req: createNestedRequest(req),
            select: { id: true } as never,
            trash: true,
          });
          deleted += 1;
        }
      }
    } finally {
      const { [deleteChangesContextKey]: _collector, ...context } = req.context;
      req.context = context;
    }

    await queueAfterPathChange({ changes: collected, options, reason: "delete", req });
    state.deleted = deleted;
    state.skipped = skipped;
    if (skippedFolders.length > 0) {
      state[skippedUnitsStateKey] = skippedFolders;
    }
    state.trashed = trashed;
  },
};

registerOperationHandler("delete", deleteHandler);

/**
 * Deletes `items` and everything beneath the folders among them (spec sections 7.10 and 9). Above
 * `confirmAbovePages` pages the request has to carry the word `previewDelete` asked for. When the
 * trash is on everywhere the delete is soft. Up to `limits.maxSyncDocuments` documents run at once in
 * one transaction under the tree lock; above that an operation is stored and its id answered, for
 * the admin to step.
 */
export const applyDelete = async (
  req: PayloadRequest,
  request: DeleteRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<DeleteResult> => {
  const plan = await planDelete(req, request, { options, overrideAccess });
  if (plan.confirmWord !== null && request.confirmWord?.trim() !== plan.confirmWord) {
    throw new DeleteBlockedError({
      confirmWord: plan.confirmWord,
      message: `Type ${plan.confirmWord} to confirm`,
      reason: "confirm",
    });
  }

  const outcome = await runOrQueue({
    kind: "delete",
    options,
    params: { isSoft: plan.isSoft, overrideAccess },
    req,
    state: { deleted: 0, skipped: 0, trashed: 0 },
    units: plan.units,
  });
  if (outcome.queued) {
    return { operationId: outcome.operationId, total: plan.units.length };
  }

  const skippedFolders = outcome.state[skippedUnitsStateKey] as OperationSkip[] | undefined;

  return {
    deleted: outcome.state.deleted as number,
    ...(skippedFolders ? { skipped: skippedFolders } : {}),
    trashed: outcome.state.trashed as number,
  };
};

export type DeleteItemsArgs = DeleteRequest & {
  /** Like Payload's Local API: default false, so the user of `req` (or `user`) needs `delete` access to everything. */
  overrideAccess?: boolean;
  req?: PayloadRequest;
  user?: CreatePayloadRequestArgs["user"];
};

/** `applyDelete` for server code: builds a request for `user` when it is not given one. */
export const deleteItems = async (
  payload: Payload,
  args: DeleteItemsArgs
): Promise<DeleteResult> => {
  const { overrideAccess, req: callerRequest, user, ...request } = args;
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));

  return applyDelete(req, request, { overrideAccess });
};
