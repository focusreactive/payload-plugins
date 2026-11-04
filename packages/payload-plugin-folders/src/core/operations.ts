import { APIError, Forbidden } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderOperationsSlug } from "../constants.js";
import type { FolderId, ResolvedOptions } from "../types.js";
import { getGlobalRegistry } from "./globalRegistry.js";
import { getResolvedOptions } from "./runtime.js";
import { bumpRevision, withTreeLock } from "./treeLock.js";

/** Documents one step of a batched operation processes (spec section 5.8). */
export const operationStepSize = 200;

export type OperationKind = "delete" | "duplicate" | "mirrorRedirects" | "publish" | "unpublish";

/** What a handler carries from one step to the next, and reports at the end (counts, id maps). */
export type OperationState = Record<string, unknown>;

export type OperationHandlerContext = {
  options: ResolvedOptions;
  /** What the caller chose when it started the operation (the target folder, a locale). */
  params: Record<string, unknown>;
  req: PayloadRequest;
  state: OperationState;
};

/**
 * What a kind of operation does with a slice of its work list. It runs inside the step's
 * transaction under the tree lock, and may be handed the same unit again after a failed step, or a
 * unit whose document is gone, so it must treat both as normal. It changes `context.state`.
 */
export type OperationHandler = {
  run: (context: OperationHandlerContext, units: unknown[]) => Promise<void>;
};

// In the global registry because the copy of this module that steps an operation (an endpoint) is
// not always the copy whose imports registered the handlers.
const handlers = getGlobalRegistry(
  "operation-handlers",
  () => new Map<OperationKind, OperationHandler>()
);

/** The operations of spec section 5.8 register themselves; tests register a stand-in. */
export const registerOperationHandler = (kind: OperationKind, handler: OperationHandler): void => {
  handlers.set(kind, handler);
};

const getHandler = (kind: OperationKind): OperationHandler => {
  const handler = handlers.get(kind);
  if (!handler) {
    throw new APIError(`There is no operation of kind "${kind}"`, 400, null, true);
  }

  return handler;
};

/** `abandoned`: the owner gave up on a failed run; it takes no more steps and nothing is undone. */
export type OperationStatus = "abandoned" | "done" | "failed" | "running";

/**
 * A folder a delete left in place because it gained content after the operation started. `path` is
 * the folder's URL path, `child` the title or name of what it holds when the caller may read it
 * and null when not.
 */
export type OperationSkip = {
  child: string | null;
  path: string;
  reason: "notEmpty";
};

/** The key a handler lists its `OperationSkip` entries under in the operation state. */
export const skippedUnitsStateKey = "skippedUnits";

export type OperationProgress = {
  done: number;
  error?: string;
  /** Left out when the operation skipped nothing. */
  skipped?: OperationSkip[];
  status: OperationStatus;
  total: number;
};

type OperationCursor = { offset: number; params: Record<string, unknown>; state: OperationState };

type OperationRow = {
  createdBy: FolderId | { id: FolderId } | null;
  cursor: OperationCursor | null;
  done: number;
  error: string | null;
  id: FolderId;
  items: unknown[] | null;
  kind: OperationKind;
  status: OperationStatus;
  total: number;
};

const operationsCollection = toCollectionSlug(folderOperationsSlug);

const readOperation = async (req: PayloadRequest, id: FolderId): Promise<OperationRow | null> =>
  (await req.payload.db.findOne({
    collection: operationsCollection,
    req,
    where: { id: { equals: id } },
  })) as OperationRow | null;

const ownerIdOf = (row: OperationRow): string | null => {
  const { createdBy } = row;
  if (createdBy === null || createdBy === undefined) {
    return null;
  }

  return String(typeof createdBy === "object" ? createdBy.id : createdBy);
};

const assertOwner = (req: PayloadRequest, row: OperationRow): void => {
  const ownerId = ownerIdOf(row);
  if (!req.user || ownerId === null || String(req.user.id) !== ownerId) {
    throw new Forbidden(req.t);
  }
};

/**
 * Stores the work list of a large operation as a `folder-operations` record (spec section 5.8) and
 * returns its id; nothing is processed until `stepOperation` runs. `items` are the units the
 * handler of `kind` takes one by one, already expanded and checked by the caller.
 */
export const startOperation = async ({
  items,
  kind,
  params = {},
  req,
  state = {},
}: {
  items: unknown[];
  kind: OperationKind;
  params?: Record<string, unknown>;
  req: PayloadRequest;
  state?: OperationState;
}): Promise<{ id: FolderId; total: number }> => {
  getHandler(kind);
  const now = new Date().toISOString();
  const created = (await req.payload.db.create({
    collection: operationsCollection,
    data: {
      createdAt: now,
      createdBy: req.user?.id ?? null,
      cursor: { offset: 0, params, state } satisfies OperationCursor,
      done: 0,
      items,
      kind,
      status: "running",
      total: items.length,
      updatedAt: now,
    },
    req,
  })) as { id: FolderId };

  return { id: created.id, total: items.length };
};

const skippedOf = (state: OperationState | undefined): OperationSkip[] => {
  const skipped = state?.[skippedUnitsStateKey];

  return Array.isArray(skipped) ? (skipped as OperationSkip[]) : [];
};

const progressOf = (row: OperationRow): OperationProgress => {
  const skipped = skippedOf(row.cursor?.state);

  return {
    done: row.done,
    ...(row.error ? { error: row.error } : {}),
    ...(skipped.length > 0 ? { skipped } : {}),
    status: row.status,
    total: row.total,
  };
};

/** What the user can read about an operation they started, without stepping it. */
export const readOperationProgress = async (
  req: PayloadRequest,
  id: FolderId
): Promise<OperationProgress> => {
  const row = await readOperation(req, id);
  if (!row) {
    throw new APIError("This operation does not exist", 404, null, true);
  }
  assertOwner(req, row);

  return progressOf(row);
};

/**
 * Gives up on an operation that failed (or is still running), for its owner only (403 otherwise,
 * 404 when there is none): it takes no more steps, and what earlier steps did stays done. Answers
 * how far it got. Waits for the tree lock, so a step in flight finishes first; a finished operation
 * is left as it is and answers `done`.
 */
export const abandonOperation = async (
  req: PayloadRequest,
  id: FolderId
): Promise<OperationProgress> => {
  const before = await readOperation(req, id);
  if (!before) {
    throw new APIError("This operation does not exist", 404, null, true);
  }
  assertOwner(req, before);

  return withTreeLock(req, async () => {
    const row = await readOperation(req, id);
    if (!row) {
      throw new APIError("This operation does not exist", 404, null, true);
    }
    if (row.status === "done" || row.status === "abandoned") {
      return progressOf(row);
    }
    await req.payload.db.updateOne({
      collection: operationsCollection,
      data: { error: null, status: "abandoned", updatedAt: new Date().toISOString() },
      id,
      req,
      returning: false,
    });

    return { done: row.done, status: "abandoned", total: row.total };
  });
};

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "The step failed";

/**
 * Stores a failed step's error after its own transaction rolled back, in a transaction of its own so
 * the failure outlives the rollback. It runs under the tree lock and only touches a record that is
 * not `done` or `abandoned`: an abandon that committed while this step was failing must keep its
 * status, and on SQLite a write outside the lock collides with that abandon's transaction
 * (`SQLITE_BUSY`). A write that still fails is logged and swallowed: the step's answer is the
 * failure it already has, and the record keeps its last status, so stepping again retries.
 */
const recordFailure = async (req: PayloadRequest, id: FolderId, message: string): Promise<void> => {
  try {
    await withTreeLock(req, async () => {
      await req.payload.db.updateMany({
        collection: operationsCollection,
        data: { error: message, status: "failed", updatedAt: new Date().toISOString() },
        req,
        returning: false,
        where: { and: [{ id: { equals: id } }, { status: { not_in: ["abandoned", "done"] } }] },
      });
    });
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: "[folders] could not record the failure of an operation step",
    });
  }
};

/**
 * Processes the next slice of an operation, up to `operationStepSize` units, in one transaction
 * under the tree lock, and answers `{ done, total, status }`. Only the user who started it may step
 * it (403 otherwise).
 *
 * The slice, the cursor and the status move together: the record is read again after the lock is
 * taken, and the cursor advances in the step's own transaction, so a step that fails rolls back its
 * work and its cursor, and stepping again does the same slice over with nothing duplicated. A
 * failed step answers `status: 'failed'` with the error and can be retried by stepping again; two
 * steps in flight queue on the lock and each takes the next slice.
 */
export const stepOperation = async (
  req: PayloadRequest,
  id: FolderId,
  { options = getResolvedOptions(req.payload) }: { options?: ResolvedOptions } = {}
): Promise<OperationProgress> => {
  const before = await readOperation(req, id);
  if (!before) {
    throw new APIError("This operation does not exist", 404, null, true);
  }
  assertOwner(req, before);
  if (before.status === "done" || before.status === "abandoned") {
    return progressOf(before);
  }

  try {
    return await withTreeLock(req, async () => {
      const row = await readOperation(req, id);
      if (!row) {
        throw new APIError("This operation does not exist", 404, null, true);
      }
      // Read again under the lock: an abandon that queued ahead of this step has landed by now.
      if (row.status === "done" || row.status === "abandoned") {
        return progressOf(row);
      }

      const items = row.items ?? [];
      const cursor: OperationCursor = row.cursor ?? { offset: 0, params: {}, state: {} };
      const units = items.slice(cursor.offset, cursor.offset + operationStepSize);
      const context: OperationHandlerContext = {
        options,
        params: cursor.params,
        req,
        state: cursor.state,
      };
      await getHandler(row.kind).run(context, units);

      const offset = cursor.offset + units.length;
      const status: OperationStatus = offset >= row.total ? "done" : "running";
      await req.payload.db.updateOne({
        collection: operationsCollection,
        data: {
          cursor: { offset, params: cursor.params, state: context.state } satisfies OperationCursor,
          done: Math.min(offset, row.total),
          error: null,
          status,
          updatedAt: new Date().toISOString(),
        },
        id,
        req,
        returning: false,
      });
      await bumpRevision(req);

      const skipped = skippedOf(context.state);

      return {
        done: Math.min(offset, row.total),
        ...(skipped.length > 0 ? { skipped } : {}),
        status,
        total: row.total,
      };
    });
  } catch (error) {
    if (!(error instanceof APIError)) {
      req.payload.logger.error({ err: error, msg: "[folders] an operation step failed" });
    }
    const message = messageOf(error);
    await recordFailure(req, id, message);

    return { done: before.done, error: message, status: "failed", total: before.total };
  }
};

/**
 * Spec section 5.8: runs `units` at once when there are at most `limits.maxSyncDocuments` of them,
 * in one transaction under the tree lock, and answers the handler's final state; above that it
 * stores them as an operation for the admin to step and answers its id, unless the call has no user
 * (a script or a job), which runs them at once. A step is idempotent, so the dialog can retry one.
 */
export const runOrQueue = async ({
  kind,
  options: givenOptions,
  params = {},
  req,
  state = {},
  units,
}: {
  kind: OperationKind;
  options?: ResolvedOptions;
  params?: Record<string, unknown>;
  req: PayloadRequest;
  state?: OperationState;
  units: unknown[];
}): Promise<{ operationId: FolderId; queued: true } | { queued: false; state: OperationState }> => {
  const handler = getHandler(kind);
  const options = givenOptions ?? getResolvedOptions(req.payload);
  // A queued operation belongs to its user, who alone may step it, so a call with no user runs now.
  if (units.length > options.limits.maxSyncDocuments && req.user) {
    const { id } = await startOperation({ items: units, kind, params, req, state });

    return { operationId: id, queued: true };
  }

  const context: OperationHandlerContext = { options, params, req, state: { ...state } };
  await withTreeLock(req, async () => {
    await handler.run(context, units);
    await bumpRevision(req);
  });

  return { queued: false, state: context.state };
};
