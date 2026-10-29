import { getDataLoader } from "payload";
import type { PayloadRequest } from "payload";

import type { PathChange, PathChangeReason, ResolvedOptions } from "../types.js";
import { runAfterCommit } from "./treeLock.js";

/**
 * The request a host hook gets after the commit. It is a copy, because the caller's request still
 * names the transaction that just ended (a host call made with it would use a finished
 * transaction) and carries a data loader that cached values from before the write, and because
 * whatever the host sets on it must not stick on the caller's request.
 */
export const createPostCommitRequest = (req: PayloadRequest): PayloadRequest => {
  const copy = {
    ...req,
    context: {},
    // A request that is a web `Request` keeps these on its prototype, which a spread drops.
    headers: req.headers,
    transactionID: undefined,
  } as PayloadRequest;
  copy.payloadDataLoader = getDataLoader(copy);

  return copy;
};

/**
 * Calls `hooks.afterPathChange` once the write is final (spec section 2.8): after the commit, with
 * the tree lock released. An error in the host's hook is logged and never fails the save.
 */
export const queueAfterPathChange = async ({
  changes,
  options,
  reason,
  req,
}: {
  changes: PathChange[];
  options: ResolvedOptions;
  reason: PathChangeReason;
  req: PayloadRequest;
}): Promise<void> => {
  const hook = options.hooks.afterPathChange;
  if (!hook || changes.length === 0) {
    return;
  }

  await runAfterCommit(req, async () => {
    try {
      await hook({ changes, reason, req: createPostCommitRequest(req) });
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: `[folders] hooks.afterPathChange threw for reason "${reason}"; the save is not affected`,
      });
    }
  });
};
