import { useCallback, useEffect, useRef, useState } from "react";

import { fetchQuickVerify } from "../api.js";
import type { FoldersApiContext, QuickVerifyResponse } from "../api.js";
import { hasFixableDrift } from "./repairLogic.js";

export type TreeHealth = {
  /** The user may rebuild the full URLs (`canRepairTree`), which the quick answer says. */
  canRepair: boolean;
  /** Some folder's path, ancestry or depth disagrees with its parent chain and a rebuild fixes it. */
  hasDrift: boolean;
  /** Reads the quick answer again; resolves once it is applied (or has failed quietly). */
  refresh: () => Promise<void>;
};

/**
 * The quick verify (`GET /verify?quick=1`: one read of the folders) that the drift banner and the
 * header menu depend on. It runs once the tree has a revision, which is when it loads, and again
 * whenever that revision changes: a move, a rename, a repair, or another editor's change seen by
 * the poll. That is often enough to clear the banner after a repair and to find drift a script
 * wrote, and it costs nothing between changes. A failed read leaves the last answer alone: a
 * banner that comes and goes with the network would be worse than one that is a moment late.
 */
export const useTreeHealth = ({
  apiContext,
  revision,
}: {
  apiContext: FoldersApiContext;
  /** The tree revision the view matches; `null` before the tree has loaded. */
  revision: number | null;
}): TreeHealth => {
  const [answer, setAnswer] = useState<QuickVerifyResponse | null>(null);
  // Only the newest read is applied: a slow answer must not undo a newer one.
  const latestRead = useRef(0);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    latestRead.current += 1;
    const read = latestRead.current;
    try {
      const next = await fetchQuickVerify(apiContext);
      if (isMounted.current && read === latestRead.current) {
        setAnswer(next);
      }
    } catch {
      // Keep what is shown; the next revision change reads again.
    }
  }, [apiContext]);

  const hasRevision = revision !== null;
  useEffect(() => {
    if (hasRevision) {
      void refresh();
    }
    // `revision` is the trigger: a new number means the tree changed.
  }, [hasRevision, refresh, revision]);

  return { canRepair: answer?.canRepair === true, hasDrift: hasFixableDrift(answer), refresh };
};
