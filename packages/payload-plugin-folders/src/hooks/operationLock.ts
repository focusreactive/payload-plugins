import type {
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from "payload";

import { acquireTreeLock, releaseUnboundTreeLock, touchTreeState } from "../core/treeLock.js";
import { isInternalWrite } from "./context.js";

// An operation that took the lock without a transaction has to give it back itself; one that only
// found the lock already held (a nested update) must not release its caller's hold.
const operationsThatAcquired = new WeakSet<object>();

type LockedOperation = "create" | "update";

/**
 * Takes the tree lock before the operation validates or writes anything, then writes the
 * tree-state row so that row lock is the first statement of the transaction, ahead of Payload
 * reading the stored document (spec section 5.2 step 1). A transaction's commit or rollback
 * releases the lock (see `installTreeLockTracking`), which covers a thrown error too.
 *
 * Known limits, also in the README:
 * - A host hook that calls `payload.create` or `payload.update` on a folder or page without
 *   passing `req`, inside a tree write, opens its own transaction and waits for the lock its
 *   caller holds. It fails after the 30 s lock timeout. Always pass `req`.
 * - On Postgres every queued tree writer holds a pool connection while it waits, so more parallel
 *   tree writes than the pool size starve other requests.
 * - On SQLite without transactions a failed operation keeps the lock until the 5 s watchdog
 *   fires.
 */
export const buildAcquireTreeLockHook =
  (lockedOperations: LockedOperation[]): CollectionBeforeOperationHook =>
  async ({ args, operation, req }) => {
    if (isInternalWrite(req) || !lockedOperations.includes(operation as LockedOperation)) {
      return;
    }
    if (await acquireTreeLock(req)) {
      operationsThatAcquired.add(args as object);
    }
    await touchTreeState(req);
  };

export const releaseUnboundTreeLockHook: CollectionAfterOperationHook = ({ args, req, result }) => {
  if (operationsThatAcquired.delete(args as object)) {
    releaseUnboundTreeLock(req as PayloadRequest);
  }

  return result;
};
