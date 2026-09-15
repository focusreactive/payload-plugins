import { APIError } from "payload";

/**
 * The caller's database transaction, reduced to the one field an operation needs to join it: Payload
 * joins one only when the id is passed under `req` on that call, and an empty scope means each
 * operation opens its own.
 */
export type TransactionScope = { transactionID?: string | number };

/** A fresh carrier per call: `createLocalReq` fills the `req` it is handed in place. */
export function freshReq(scope: TransactionScope): TransactionScope {
  return { ...scope };
}

/**
 * Whether this failure has already rolled the caller's transaction back: Payload's `killTransaction`
 * fires from the catch of every operation and rolls back whenever a transaction id is present,
 * without checking whose it is. Rethrowing cannot save the caller's edit — it is already gone — it
 * only stops the translator reporting a save that did not happen.
 *
 * Narrowed to `APIError` because only a Payload operation reaches `killTransaction`; a provider
 * outage throws before any operation runs and leaves the save intact.
 */
export function killedTheCallersTransaction(scope: TransactionScope, error: unknown): boolean {
  return scope.transactionID != null && error instanceof APIError;
}
