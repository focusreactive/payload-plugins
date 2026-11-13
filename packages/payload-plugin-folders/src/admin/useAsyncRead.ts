import { useEffect } from "react";
import type { DependencyList } from "react";

/**
 * Runs `read` after render and again whenever `dependencies` change. `read` asks `isCurrent()`
 * before it applies an answer: it is false once the dependencies changed or the component left, so
 * a slow earlier read can never overwrite what a later one set.
 */
export const useAsyncRead = (
  read: (isCurrent: () => boolean) => Promise<void>,
  dependencies: DependencyList
): void => {
  useEffect(() => {
    let isCurrent = true;
    void read(() => isCurrent);

    return () => {
      isCurrent = false;
    };
    // The caller owns the dependency list; `read` is a new closure on every render.
  }, dependencies);
};
