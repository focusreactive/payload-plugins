import { commitTransaction, initTransaction, killTransaction } from "payload";
import type { PayloadRequest } from "payload";

/**
 * Runs `fn` in one database transaction on `req` (spec section 5.2): it begins one when the request
 * has none, commits when `fn` returns and kills it when `fn` throws, so a failure anywhere leaves
 * nothing written. A request that already carries a transaction (a caller's, or a hook's) is
 * joined, never committed or killed here: its owner decides. An adapter that runs without
 * transactions makes `isOwner` false, and nothing is rolled back on a failure.
 */
export const withTransaction = async <TResult>(
  req: PayloadRequest,
  fn: (context: { isOwner: boolean }) => Promise<TResult>
): Promise<TResult> => {
  const isOwner = await initTransaction(req);
  try {
    const result = await fn({ isOwner });
    if (isOwner) {
      await commitTransaction(req);
    }

    return result;
  } catch (error) {
    if (isOwner) {
      await killTransaction(req);
    }
    throw error;
  }
};
