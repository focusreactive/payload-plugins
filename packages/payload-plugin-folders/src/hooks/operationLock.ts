import type {
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from "payload";

import { acquireTreeLock, releaseUnboundTreeLock } from "../core/treeLock.js";
import { isInternalWrite } from "./context.js";

// An operation that took the lock without a transaction has to give it back itself; one that only
// found the lock already held (a nested update) must not release its caller's hold.
const operationsThatAcquired = new WeakSet<object>();

type LockedOperation = "create" | "update";

/**
 * Takes the tree lock before the operation validates or writes anything. A transaction's commit
 * or rollback releases it (see `installTreeLockTracking`), which covers a thrown error too.
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
  };

export const releaseUnboundTreeLockHook: CollectionAfterOperationHook = ({ args, req, result }) => {
  if (operationsThatAcquired.delete(args as object)) {
    releaseUnboundTreeLock(req as PayloadRequest);
  }

  return result;
};
