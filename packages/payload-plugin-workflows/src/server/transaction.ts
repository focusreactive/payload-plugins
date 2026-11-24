// Whether a request's transaction survived a failed workflow write. The hooks' and operations'
// writes share the caller's transaction and have no savepoint, so one failure can end it:
// - a Payload operation that throws rolls back `req`'s transaction and deletes `req.transactionID`
//   (`killTransaction`), on every adapter;
// - a statement that fails in the database aborts a Postgres transaction while it stays registered
//   (the final COMMIT then silently rolls back). The plugin's raw adapter writes (`db.updateOne`,
//   the effect job insert) record their failure here, since nothing else shows it.

import type { PayloadRequest } from "payload";

export type TransactionId = string | number;

/** The request's transaction id, `null` when there is none (or transactions are off). */
export const transactionOf = async (req: PayloadRequest): Promise<TransactionId | null> => {
  // Without database transactions Payload leaves a promise of `null` here.
  const id = req.transactionID instanceof Promise ? await req.transactionID : req.transactionID;
  return id || null;
};

/** Transactions in which one of the plugin's raw database writes failed, per request. */
const failedWrites = new WeakMap<PayloadRequest, Set<TransactionId>>();

/** Runs one raw database write; if it throws inside a transaction, that transaction is spent. */
export const writing = async <T>(req: PayloadRequest, write: () => Promise<T>): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    const id = await transactionOf(req);
    if (id !== null) {
      const set = failedWrites.get(req) ?? new Set<TransactionId>();
      set.add(id);
      failedWrites.set(req, set);
    }
    throw error;
  }
};

export interface TransactionFacts {
  /** The transaction the request had when the work began (`null`: none). */
  began: TransactionId | null;
  /** The request's transaction now. */
  current: TransactionId | null;
  /** Whether the adapter still holds a session for `began` (`undefined`: cannot tell). */
  registered: boolean | undefined;
  /** Whether a database write failed inside `began`. */
  writeFailed: boolean;
}

/**
 * Whether a transaction that existed when the work began can no longer commit what was written in
 * it: it was rolled back (gone from the request or from the adapter), or a write failed in it.
 * Without a transaction at the start there is nothing to lose: each write committed on its own.
 */
export const isTransactionLost = (facts: TransactionFacts): boolean =>
  facts.began !== null &&
  (facts.current !== facts.began || facts.registered === false || facts.writeFailed);

/** `isTransactionLost` for a request whose transaction was `began` when the work started. */
export const transactionLost = async (
  req: PayloadRequest,
  began: TransactionId | null
): Promise<boolean> => {
  if (began === null) {
    return false;
  }
  // Both the drizzle adapters and mongoose keep open transactions in `db.sessions`, by id.
  const { sessions } = req.payload.db as { sessions?: Record<string, unknown> };
  return isTransactionLost({
    began,
    current: await transactionOf(req),
    registered: sessions ? Object.hasOwn(sessions, String(began)) : undefined,
    writeFailed: failedWrites.get(req)?.has(began) ?? false,
  });
};
