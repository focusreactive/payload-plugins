import { useEffect, useRef, useState } from "react";

import type { FolderId } from "../../types.js";
import type { TreeStore } from "../store.js";
import {
  expandedPreferenceKey,
  formatExpandedParam,
  parseExpandedParam,
  savedExpandedOf,
} from "./treeUrlState.js";

type PreferenceApi = {
  getPreference: <T = unknown>(key: string) => Promise<T>;
  setPreference: (key: string, value: unknown) => Promise<void>;
};

/**
 * Which folders are open survives a reload (spec section 7.2). The address carries the list
 * (`?expanded=`), so a link or a reload shows the same tree; the admin preferences carry it for
 * a visit with no list in the address, such as the nav link. On the way in the address wins, then
 * the folders already open in this tab, then the preference; on the way out every change is
 * written to the address (replacing the history entry, so Back is not spent on a chevron) and to
 * the preference, at once: a click is slow enough for one request each.
 *
 * It also decides when the tree may mount: only once the open folders are known, so the first
 * rows read are the right ones. Returns that.
 */
export const useExpandedPersistence = ({
  expandedParam,
  getPreference,
  isConfigured,
  setExpandedInUrl,
  setPreference,
  store,
  zoomFolderId,
}: PreferenceApi & {
  expandedParam: string | null;
  /** The store has its options: nothing is read before. */
  isConfigured: boolean;
  setExpandedInUrl: (folders: readonly FolderId[]) => void;
  store: TreeStore;
  zoomFolderId: FolderId | null;
}): boolean => {
  const [isReady, setIsReady] = useState(false);
  // What the one-time restore reads, which must not restart it when they change.
  const latest = useRef({ expandedParam, getPreference, zoomFolderId });
  latest.current = { expandedParam, getPreference, zoomFolderId };
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    if (!isConfigured || isReady) {
      return undefined;
    }
    let isCurrent = true;
    const restore = async () => {
      const fromUrl = parseExpandedParam(latest.current.expandedParam);
      let folders = fromUrl;
      if (folders === null && store.getState().expanded.length === 0) {
        try {
          folders = savedExpandedOf(
            await latest.current.getPreference<unknown>(expandedPreferenceKey)
          );
        } catch {
          // No saved list is the same as a closed tree.
        }
      }
      if (!isCurrent) {
        return;
      }
      // The zoom is set before the tree mounts, so its first read is the zoomed folder's.
      void store.setZoom(latest.current.zoomFolderId);
      if (folders !== null) {
        void store.replaceExpanded(folders);
      }
      // A list that came from the address is already there; any other is written to it below.
      lastWritten.current = fromUrl === null ? null : formatExpandedParam(fromUrl);
      setIsReady(true);
    };
    void restore();

    return () => {
      isCurrent = false;
    };
  }, [isConfigured, isReady, store]);

  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    // One save at a time and the newest last: two saves in flight could land in either order.
    let isSaving = false;
    let queued: FolderId[] | null = null;
    const save = async (expanded: FolderId[]): Promise<void> => {
      if (isSaving) {
        queued = expanded;

        return;
      }
      isSaving = true;
      try {
        await setPreference(expandedPreferenceKey, { expanded });
      } catch {
        // A preference that fails to save costs only the next visit's open folders.
      } finally {
        isSaving = false;
      }
      if (queued !== null) {
        const next = queued;
        queued = null;
        await save(next);
      }
    };
    const persist = () => {
      const expanded = store.getState().expanded;
      const serialized = formatExpandedParam(expanded);
      if (serialized === (lastWritten.current ?? "")) {
        return;
      }
      lastWritten.current = serialized;
      setExpandedInUrl(expanded);
      void save([...expanded]);
    };
    persist();

    return store.subscribe(persist);
  }, [isReady, setExpandedInUrl, setPreference, store]);

  return isReady;
};
