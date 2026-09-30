import { APIError } from "payload";

import type { RequestScope } from "./RequestScope.shapes.js";

/**
 * Payload's `killTransaction` fires from the catch of every operation and rolls back whenever a
 * transaction id is present, whoever owns it. Narrowed to `APIError` because only a Payload operation
 * reaches it — a provider outage throws before any operation runs.
 */
export function killedTheCallersTransaction(scope: RequestScope, error: unknown): boolean {
  return scope.transactionID != null && error instanceof APIError;
}
