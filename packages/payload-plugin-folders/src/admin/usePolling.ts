import { useEffect } from "react";

import { revisionPollIntervalMs } from "./store.js";
import type { TreeStore } from "./store.js";

/**
 * Keeps the store's revision polled while `isEnabled`. Payload has no realtime API, so the
 * revision is asked for on a timer, and again when the tab is back in front.
 */
export const usePolling = (store: TreeStore, isEnabled: boolean): void => {
  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }
    const stopPolling = store.startPolling(revisionPollIntervalMs);
    const pollOnReturn = () => {
      if (document.visibilityState === "visible") {
        void store.pollRevision();
      }
    };
    window.addEventListener("focus", pollOnReturn);
    document.addEventListener("visibilitychange", pollOnReturn);

    return () => {
      stopPolling();
      window.removeEventListener("focus", pollOnReturn);
      document.removeEventListener("visibilitychange", pollOnReturn);
    };
  }, [isEnabled, store]);
};
