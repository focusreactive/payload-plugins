"use client";

import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import type { KeyphraseEntry } from "./keyphraseState";
import { clearKeyphrases, entriesOrBlank } from "./keyphraseStorage";
import type { RemoteSaver } from "./remoteSaver";

export type PendingSync = "upload" | "retry" | null;

interface RemoteSyncArgs {
  saver: RemoteSaver | null;
  pending: PendingSync;
  browserKey: string;
  listRef: RefObject<KeyphraseEntry[]>;
  replaceList: (next: KeyphraseEntry[]) => void;
}

export interface RemoteSync {
  syncOnOpen: () => void;
  cancelSync: () => void;
}

export function useRemoteSync({
  saver,
  pending,
  browserKey,
  listRef,
  replaceList,
}: RemoteSyncArgs): RemoteSync {
  const pendingRef = useRef(pending);

  const cancelSync = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const uploadBrowserCopy = useCallback(async () => {
    const uploaded = listRef.current;
    const outcome = await saver?.save(uploaded, { ifAbsent: true });
    if (!outcome || outcome.status === "failed") return;

    clearKeyphrases(browserKey);
    if (outcome.status === "exists" && listRef.current === uploaded) {
      replaceList(entriesOrBlank(outcome.keyphrases));
    }
  }, [browserKey, listRef, replaceList, saver]);

  const retryUnsaved = useCallback(() => {
    saver?.schedule(listRef.current);
    void saver?.flush();
  }, [listRef, saver]);

  const syncOnOpen = useCallback(() => {
    const sync = pendingRef.current;
    pendingRef.current = null;

    if (sync === "upload") void uploadBrowserCopy();
    if (sync === "retry") retryUnsaved();
  }, [retryUnsaved, uploadBrowserCopy]);

  return { syncOnOpen, cancelSync };
}
