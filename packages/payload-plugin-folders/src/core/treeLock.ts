import { commitTransaction, initTransaction, killTransaction } from "payload";
import type { Payload, PayloadRequest } from "payload";

import { treeStateSlug } from "../constants.js";

/** Longest a writer waits for the lock before it fails, so a lost release cannot hang the server. */
export const treeLockTimeoutMs = 30_000;

type Release = () => void;

/** A first-come, first-served mutex whose waiters give up after a timeout. */
export class AsyncMutex {
  private isLocked = false;
  private readonly waiters: Array<{ grant: () => void; timer?: ReturnType<typeof setTimeout> }> =
    [];

  get locked(): boolean {
    return this.isLocked;
  }

  private createRelease(): Release {
    let released = false;

    return () => {
      if (released) {
        return;
      }
      released = true;
      const next = this.waiters.shift();
      if (next) {
        // The lock passes straight to the next waiter and never reads as free in between.
        next.grant();
      } else {
        this.isLocked = false;
      }
    };
  }

  acquire(timeoutMs: number): Promise<Release> {
    if (!this.isLocked) {
      this.isLocked = true;
      return Promise.resolve(this.createRelease());
    }

    return new Promise<Release>((resolve, reject) => {
      const waiter: { grant: () => void; timer?: ReturnType<typeof setTimeout> } = {
        grant: () => {
          clearTimeout(waiter.timer);
          resolve(this.createRelease());
        },
      };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
        reject(new Error(`Timed out after ${timeoutMs} ms waiting for the folder tree lock`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
}

type HeldLock = {
  release: Release;
  /** The tree-state row has been written in this hold. */
  touched: boolean;
};

type AfterCommitCallback = () => Promise<void> | void;

type TreeLockRuntime = {
  /** Callbacks that wait for a transaction to commit, keyed by transaction id. */
  afterCommitByTransaction: Map<string, AfterCommitCallback[]>;
  /** Callbacks of a request without a transaction, run when its operation has finished. */
  afterOperationByRequest: WeakMap<PayloadRequest, AfterCommitCallback[]>;
  mutex: AsyncMutex;
  /** Locks that live exactly as long as a database transaction, keyed by transaction id. */
  heldByTransaction: Map<string, HeldLock>;
  /** Locks of a request that runs without a transaction (an adapter with transactions off). */
  heldByRequest: WeakMap<PayloadRequest, HeldLock>;
};

// Keyed on the Payload instance so that parallel instances (the integration tests boot one per
// file) never queue behind each other.
const runtimes = new WeakMap<Payload, TreeLockRuntime>();
const trackedAdapters = new WeakSet<object>();

/**
 * Without a transaction nothing signals a failed operation, so a lock held for a request that has
 * none is given back after this long. Operations there are not atomic anyway (spec section 5.2),
 * so the lock is best effort; a stuck one must clear well before `treeLockTimeoutMs`.
 */
export const unboundLockWatchdogMs = 5000;

const getRuntime = (payload: Payload): TreeLockRuntime => {
  let runtime = runtimes.get(payload);
  if (!runtime) {
    runtime = {
      afterCommitByTransaction: new Map(),
      afterOperationByRequest: new WeakMap(),
      heldByRequest: new WeakMap(),
      heldByTransaction: new Map(),
      mutex: new AsyncMutex(),
    };
    runtimes.set(payload, runtime);
  }

  return runtime;
};

type TransactionAdapter = {
  beginTransaction?: (...args: unknown[]) => Promise<null | number | string | undefined | void>;
  commitTransaction?: (id: unknown) => Promise<unknown>;
  name?: string;
  rollbackTransaction?: (id: unknown) => Promise<unknown>;
};

const toTransactionKey = (resolved: unknown): string | undefined =>
  typeof resolved === "string" || typeof resolved === "number" ? String(resolved) : undefined;

const resolveTransactionKey = async (id: unknown): Promise<string | undefined> =>
  toTransactionKey(await id);

/**
 * Makes the tree lock live as long as the transaction that took it.
 *
 * Payload fires `afterOperation` before it commits and has no hook that runs after a failed
 * operation in the Local API, so a lock released from a hook either lets the next writer in
 * before the commit or stays held after an error. Releasing on the adapter's commit and rollback
 * covers both. On SQLite the lock is also what lets parallel writers queue: the adapter opens
 * every transaction with `BEGIN IMMEDIATE`, and a second one fails with "database is locked"
 * instead of waiting.
 */
export const installTreeLockTracking = (payload: Payload, adapter: object): void => {
  if (trackedAdapters.has(adapter)) {
    return;
  }
  trackedAdapters.add(adapter);

  const target = adapter as TransactionAdapter;
  const runtime = getRuntime(payload);
  const originalBegin = target.beginTransaction;
  const originalCommit = target.commitTransaction;
  const originalRollback = target.rollbackTransaction;

  if (originalBegin && target.name === "sqlite") {
    target.beginTransaction = async function beginTransaction(...args) {
      const release = await runtime.mutex.acquire(treeLockTimeoutMs);
      try {
        const transactionID = await originalBegin.apply(this, args);
        const transactionKey = toTransactionKey(transactionID);
        if (transactionKey === undefined) {
          // The adapter runs without transactions; there is nothing to hold the lock for.
          release();
          return transactionID;
        }
        runtime.heldByTransaction.set(transactionKey, { release, touched: false });

        return transactionID;
      } catch (error) {
        release();
        throw error;
      }
    };
  }

  const runCallbacks = async (callbacks: AfterCommitCallback[]): Promise<void> => {
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        // The writes are committed; a failing callback must not fail the commit it follows.
        payload.logger.error({ err: error, msg: "[folders] a callback after commit threw" });
      }
    }
  };

  // The lock goes first and the callbacks after it, so a callback that writes to the tree takes
  // the lock itself instead of waiting for one its own commit still holds.
  const endTransaction = (
    original: ((id: unknown) => Promise<unknown>) | undefined,
    isCommit: boolean
  ) =>
    async function endTransactionThroughTreeLock(this: unknown, id: unknown) {
      const resolvedId = await id;
      const transactionKey = toTransactionKey(resolvedId);
      let hasEnded = false;
      let result: unknown;
      try {
        result = await original?.call(this, resolvedId);
        hasEnded = true;
      } finally {
        let callbacks: AfterCommitCallback[] = [];
        if (transactionKey !== undefined) {
          callbacks = runtime.afterCommitByTransaction.get(transactionKey) ?? [];
          runtime.afterCommitByTransaction.delete(transactionKey);
          const held = runtime.heldByTransaction.get(transactionKey);
          runtime.heldByTransaction.delete(transactionKey);
          held?.release();
        }
        if (isCommit && hasEnded) {
          await runCallbacks(callbacks);
        }
      }

      return result;
    };

  if (originalCommit) {
    target.commitTransaction = endTransaction(originalCommit, true);
  }
  if (originalRollback) {
    target.rollbackTransaction = endTransaction(originalRollback, false);
  }
};

const findHeldLock = async (
  runtime: TreeLockRuntime,
  req: PayloadRequest
): Promise<HeldLock | undefined> => {
  const transactionKey = await resolveTransactionKey(req.transactionID);

  return transactionKey === undefined
    ? runtime.heldByRequest.get(req)
    : runtime.heldByTransaction.get(transactionKey);
};

/**
 * Takes the tree lock for the request's transaction, unless it already holds it, and says whether
 * it took it. Hook-driven
 * writes (a folder or page create, a folder update) call this from `beforeOperation`; the lock is
 * released by the transaction's commit or rollback, or by `releaseUnboundTreeLock` when the
 * request has no transaction.
 */
export const acquireTreeLock = async (req: PayloadRequest): Promise<boolean> => {
  const { payload } = req;
  installTreeLockTracking(payload, payload.db);
  const runtime = getRuntime(payload);

  if (await findHeldLock(runtime, req)) {
    return false;
  }

  const release = await runtime.mutex.acquire(treeLockTimeoutMs);
  const transactionKey = await resolveTransactionKey(req.transactionID);

  if (transactionKey === undefined) {
    const watchdog: { timer?: ReturnType<typeof setTimeout> } = {};
    const releaseAndForget = () => {
      clearTimeout(watchdog.timer);
      runtime.heldByRequest.delete(req);
      release();
    };
    watchdog.timer = setTimeout(() => {
      payload.logger.warn(
        `[folders] released a tree lock held for ${unboundLockWatchdogMs} ms by a request without a transaction`
      );
      releaseAndForget();
    }, unboundLockWatchdogMs);
    watchdog.timer.unref();
    runtime.heldByRequest.set(req, { release: releaseAndForget, touched: false });
  } else {
    runtime.heldByTransaction.set(transactionKey, { release, touched: false });
  }

  return true;
};

/**
 * Runs `callback` once the write it belongs to is final. With a transaction that is after the
 * commit, with the tree lock already released, and never when the transaction rolls back. Without
 * one the writes are already final, so the callback waits only for the lock to be given back, at
 * the end of the operation (`runUnboundAfterOperationCallbacks`). A callback that throws is logged.
 */
export const runAfterCommit = async (
  req: PayloadRequest,
  callback: AfterCommitCallback
): Promise<void> => {
  const runtime = getRuntime(req.payload);
  const transactionKey = await resolveTransactionKey(req.transactionID);
  if (transactionKey === undefined) {
    runtime.afterOperationByRequest.set(req, [
      ...(runtime.afterOperationByRequest.get(req) ?? []),
      callback,
    ]);

    return;
  }
  runtime.afterCommitByTransaction.set(transactionKey, [
    ...(runtime.afterCommitByTransaction.get(transactionKey) ?? []),
    callback,
  ]);
};

/** Runs what `runAfterCommit` queued for a request that had no transaction. */
export const runUnboundAfterOperationCallbacks = async (req: PayloadRequest): Promise<void> => {
  const runtime = runtimes.get(req.payload);
  const callbacks = runtime?.afterOperationByRequest.get(req);
  if (!runtime || !callbacks) {
    return;
  }
  runtime.afterOperationByRequest.delete(req);
  for (const callback of callbacks) {
    try {
      await callback();
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "[folders] a callback after the write threw" });
    }
  }
};

/** Whether this request's transaction (or the request itself, without one) already holds the lock. */
export const holdsTreeLock = async (req: PayloadRequest): Promise<boolean> =>
  Boolean(await findHeldLock(getRuntime(req.payload), req));

/** For a request without a transaction there is no commit to release the lock, so the hook does. */
export const releaseUnboundTreeLock = (req: PayloadRequest): void => {
  const runtime = runtimes.get(req.payload);
  const held = runtime?.heldByRequest.get(req);
  if (runtime && held) {
    runtime.heldByRequest.delete(req);
    held.release();
  }
};

/** Whether the instance's tree lock is taken right now. Tests use it to prove a release. */
export const isTreeLockHeld = (payload: Payload): boolean =>
  runtimes.get(payload)?.mutex.locked ?? false;

/**
 * Creates the tree-state row when it is missing. The first `updateGlobal` on an empty table is an
 * INSERT, which takes no row lock, so two processes could each insert their own row and never
 * queue on one.
 */
export const seedTreeState = async (payload: Payload): Promise<void> => {
  const existing = (await payload.db.findGlobal({ slug: treeStateSlug as never })) as {
    id?: number | string;
  };
  if (existing.id === undefined) {
    await payload.db.createGlobal({
      data: { revision: 0 },
      returning: false,
      slug: treeStateSlug as never,
    });
  }
};

/**
 * Writes the tree-state row so concurrent transactions in other processes queue on its row lock.
 * It has to run before the transaction reads anything it will act on. Without a transaction
 * there is no lock to queue on, so it does nothing.
 */
export const touchTreeState = async (req: PayloadRequest): Promise<void> => {
  const { payload } = req;
  if ((await resolveTransactionKey(req.transactionID)) === undefined) {
    return;
  }
  const held = await findHeldLock(getRuntime(payload), req);
  if (held?.touched) {
    return;
  }

  await payload.db.updateGlobal({
    data: { lockedAt: new Date().toISOString() },
    req,
    returning: false,
    slug: treeStateSlug as never,
  });
  if (held) {
    held.touched = true;
  }
};

/** Adds one to `folders-tree-state.revision`; the admin's change detection reads it. */
export const bumpRevision = async (req: PayloadRequest): Promise<number> => {
  const { payload } = req;
  const current = (await payload.db.findGlobal({ req, slug: treeStateSlug as never })) as {
    revision?: null | number;
  };
  const revision = (current.revision ?? 0) + 1;
  await payload.db.updateGlobal({
    data: { revision },
    req,
    returning: false,
    slug: treeStateSlug as never,
  });

  return revision;
};

/**
 * Runs `fn` in one transaction under the tree lock (spec section 5.2): the in-process mutex, then
 * the tree-state row as the first statement. A request that already holds the lock (it sits
 * inside a hook-driven write) just runs `fn`. The caller owns `bumpRevision`.
 */
export const withTreeLock = async <TResult>(
  req: PayloadRequest,
  fn: () => Promise<TResult>
): Promise<TResult> => {
  installTreeLockTracking(req.payload, req.payload.db);
  // Beginning the transaction first matters on SQLite, where this is what takes the lock.
  const shouldCommit = await initTransaction(req);
  const alreadyHeld = await holdsTreeLock(req);
  try {
    await acquireTreeLock(req);
    await touchTreeState(req);
    const result = await fn();
    if (shouldCommit) {
      await commitTransaction(req);
    }

    return result;
  } catch (error) {
    if (shouldCommit) {
      await killTransaction(req);
    }
    throw error;
  } finally {
    if (!alreadyHeld) {
      releaseUnboundTreeLock(req);
    }
  }
};
