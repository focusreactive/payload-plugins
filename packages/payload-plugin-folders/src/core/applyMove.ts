import { createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, PathChange, ResolvedOptions } from "../types.js";
import { queueAfterPathChange } from "./afterPathChange.js";
import { readFolderRecord } from "./folderRecords.js";
import { buildMovePlan, MoveBlockedError } from "./move.js";
import type { MovePlan, MoveRequest, PlannedMoveItem, PlanSettings } from "./move.js";
import { writeKeyRewrites } from "./orderKeys.js";
import { redirectRowsOfMovedItem, settleRedirectRows, takenPathsOf } from "./redirects.js";
import { getResolvedOptions } from "./runtime.js";
import { hasLatestVersion, patchLatestVersionStructure } from "./structureWrite.js";
import { writeFolderRow, writeSubtreeRewrite } from "./subtree.js";
import { bumpRevision, withTreeLock } from "./treeLock.js";
import { applyTypeLock } from "./typeLocks.js";

export type MoveResult = {
  /** Every full path the move changed, folders and pages, per locale. */
  changes: PathChange[];
  /** The items that moved on their own, in the given order; items that moved with a folder are not listed. */
  moved: ItemRef[];
  /** The key each moved item now has, `collection:id` to key. */
  orderKeys: Record<string, string>;
  /** The value of `folders-tree-state.revision` after the move. */
  revision: number;
  /** The revision each moved item now has, `collection:id` to revision. */
  structureRevisions: Record<string, number>;
};

const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

const writeMovedFolder = async ({
  item,
  options,
  req,
}: {
  item: PlannedMoveItem;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<void> => {
  const { current, previous, subtree } = item.folder as NonNullable<PlannedMoveItem["folder"]>;

  if (!(item.parentChanges && subtree)) {
    // A reorder: only non-localized columns, so no locale row of the folder is touched.
    await req.payload.db.updateOne({
      collection: toCollectionSlug(options.folders.slug),
      data: {
        orderKey: item.orderKey,
        structureRevision: item.structureRevision,
        updatedAt: new Date().toISOString(),
      },
      id: previous.id,
      req,
      returning: false,
    });

    return;
  }

  await writeFolderRow({
    ancestorIds: current.ancestorIds ?? "/",
    depth: current.depth ?? 0,
    fullPath: current.fullPath as Record<string, string>,
    options,
    record: current,
    req,
  });
  await writeSubtreeRewrite({ options, req, subtree });
};

/**
 * A folder that leaves a type lock keeps the types it was given and loses the lock marker, as an
 * unlock does (spec section 2.3); a folder that arrives under a lock takes the locked types.
 * `applyTypeLock` skips every row that already matches, so a move inside one lock writes nothing.
 */
const settleTypeLocks = async ({
  movedFolders,
  options,
  plan,
  req,
}: {
  movedFolders: PlannedMoveItem[];
  options: ResolvedOptions;
  plan: MovePlan;
  req: PayloadRequest;
}): Promise<void> => {
  if (plan.lockOwnerId !== null) {
    const locker = await readFolderRecord(req, options, plan.lockOwnerId);
    if (locker) {
      await applyTypeLock({ locker, options, req });
    }

    return;
  }

  for (const item of movedFolders) {
    const { previous, subtree } = item.folder as NonNullable<PlannedMoveItem["folder"]>;
    const subtreeRows = [previous, ...(subtree?.descendants.map((row) => row.previous) ?? [])];
    const subtreeIds = new Set(subtreeRows.map((row) => String(row.id)));
    for (const row of subtreeRows) {
      // A lock inside the moved subtree still holds; one from a folder left behind does not.
      if (row.typesLockedBy !== null && !subtreeIds.has(String(row.typesLockedBy))) {
        await req.payload.db.updateOne({
          collection: toCollectionSlug(options.folders.slug),
          data: { typesLockedBy: null, updatedAt: new Date().toISOString() },
          id: row.id,
          req,
          returning: false,
        });
      }
    }
  }
};

/**
 * Spec sections 5.2 and 5.3: one transaction under the tree lock. Re-plans after the lock is taken
 * (so a move committed a moment earlier is visible), refuses with a `MoveBlockedError` when any
 * check blocks, then writes folders, pages and the revision, and calls `hooks.afterPathChange`
 * with reason `move` after the commit. Any failure rolls everything back and calls no hook.
 *
 * Unless `overrideAccess` is true, the access checks of spec section 9 run inside the plan, so a
 * refusal is a `MoveBlockedError` with reason `forbidden` (403) and nothing is written.
 *
 * Writes go to the database directly, never through the Local API: a move is structure, it must
 * not run page hooks, publish a pending draft or create a version. A page's main row gets
 * `folder`, `orderKey`, `structureRevision` and `updatedAt`, and its latest version only the same
 * columns, never a full version object, so no locale of the draft is touched.
 */
export const applyMove = async (
  req: PayloadRequest,
  request: MoveRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions } & PlanSettings = {}
): Promise<MoveResult> =>
  withTreeLock(req, async () => {
    const plan = await buildMovePlan(req, options, request, { overrideAccess });
    if (!plan.preview.ok) {
      throw new MoveBlockedError(plan.preview.blocked);
    }
    const { payload } = req;
    const targetId: FolderId | null = plan.preview.targetFolderId;
    const updatedAt = new Date().toISOString();

    if (plan.insertPlan) {
      await writeKeyRewrites(req, options, plan.insertPlan.rewrites);
    }

    // Folders first, then pages, as spec section 5.2 orders them.
    const movedFolders = plan.items.filter((item) => item.kind === "folder");
    for (const item of movedFolders) {
      await writeMovedFolder({ item, options, req });
    }
    await settleTypeLocks({
      movedFolders: movedFolders.filter((item) => item.parentChanges),
      options,
      plan,
      req,
    });

    for (const item of plan.items.filter((planned) => planned.kind === "page")) {
      const collection = toCollectionSlug(item.ref.collection);
      await payload.db.updateOne({
        collection,
        data: {
          folder: targetId,
          orderKey: item.orderKey,
          structureRevision: item.structureRevision,
          updatedAt,
        },
        id: item.ref.id,
        req,
        returning: false,
      });
      if (hasLatestVersion(payload, item.ref.collection)) {
        await patchLatestVersionStructure(
          req,
          item.ref.collection,
          item.ref.id,
          { folder: targetId, orderKey: item.orderKey, structureRevision: item.structureRevision },
          updatedAt
        );
      }
    }

    const changes = plan.items.flatMap((item) => item.changes);
    // Spec section 5.6, inside this transaction: a rollback leaves no row. The rows are the same
    // ones the preview counted (`redirectRowsOfMovedItem`); a page's own row is written here, a
    // folder's prefix row stands for every page beneath it.
    await settleRedirectRows({
      clear: plan.redirects || options.redirects.enabled ? takenPathsOf(req.payload, changes) : [],
      req,
      rows: plan.redirects ? plan.items.flatMap((item) => redirectRowsOfMovedItem(item)) : [],
    });

    const revision = await bumpRevision(req);
    await queueAfterPathChange({ changes, options, reason: "move", req });

    return {
      changes,
      moved: plan.items.map((item) => item.ref),
      orderKeys: Object.fromEntries(plan.items.map((item) => [itemKey(item.ref), item.orderKey])),
      revision,
      structureRevisions: Object.fromEntries(
        plan.items.map((item) => [itemKey(item.ref), item.structureRevision])
      ),
    };
  });

export type MoveItemsArgs = MoveRequest & {
  /**
   * Like Payload 4's Local API (4.0.0-beta.5): default false, so the `update` access of every moved
   * document (and the publish rights a published URL change needs) and `access.move` are checked
   * as the user of `req`, or `user`, and a refusal throws `MoveBlockedError` with reason
   * `forbidden`. Pass true for a system call that must not be refused.
   */
  overrideAccess?: boolean;
  /** The request to run on, so a caller's transaction and user carry over. Default: a new one. */
  req?: PayloadRequest;
  /** Who moves the items, for `hooks.afterPathChange`; ignored when `req` is given. */
  user?: CreatePayloadRequestArgs["user"];
};

/**
 * Moves or reorders items under the tree lock (spec section 6): `{ items, toFolder, position? }`
 * or `{ items, after }`, one or many, kept in the given order. Throws `MoveBlockedError` (a
 * `APIError`) naming the item and the reason when a check refuses, and changes nothing. Checks
 * access unless `overrideAccess: true`; the REST endpoints always do.
 */
export const moveItems = async (payload: Payload, args: MoveItemsArgs): Promise<MoveResult> => {
  const { overrideAccess, req: callerRequest, user, ...request } = args;
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));

  return applyMove(req, request as MoveRequest, { overrideAccess });
};
