"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import * as ops from "./keyphraseState";
import type { KeyphraseEntry } from "./keyphraseState";
import {
  clearKeyphrases,
  loadKeyphrases,
  loadUnsavedKeyphrases,
  saveKeyphrases,
  storageKey,
  toEntries,
  unsavedStorageKey,
} from "./keyphraseStorage";
import { createRemoteSaver } from "./remoteSaver";

export interface RemoteKeyphrases {
  apiRoute: string;
  initial: StoredKeyphrase[];
  indexed: boolean;
  canUpdate: boolean;
}

export interface UseKeyphrasesArgs {
  collectionSlug: string;
  docId: string;
  localeCode: string;
  remote?: RemoteKeyphrases;
}

export interface UseKeyphrasesApi {
  keyphrases: KeyphraseEntry[];
  addRelated: () => string | undefined;
  updateText: (id: string, text: string) => void;
  addSynonym: (id: string, syn: string) => void;
  removeSynonym: (id: string, index: number) => void;
  remove: (id: string) => void;
  setFocus: (id: string) => void;
  isDuplicate: (id: string, text: string) => boolean;
  syncOnOpen: () => void;
  readOnly: boolean;
  saveFailed: boolean;
}

type PendingSync = "upload" | "retry" | null;

interface InitialState {
  entries: KeyphraseEntry[];
  sync: PendingSync;
}

function entriesOrBlank(stored: StoredKeyphrase[]): KeyphraseEntry[] {
  const entries = toEntries(stored);

  return entries.length ? entries : [ops.createEntry()];
}

function initialList(key: string, remote?: RemoteKeyphrases): KeyphraseEntry[] {
  return remote?.indexed ? entriesOrBlank(remote.initial) : loadKeyphrases(key);
}

function initialState(key: string, unsavedKey: string, remote?: RemoteKeyphrases): InitialState {
  const unsaved = remote?.canUpdate ? loadUnsavedKeyphrases(unsavedKey) : null;
  if (unsaved) return { entries: unsaved, sync: "retry" };

  const entries = initialList(key, remote);
  const hasBrowserCopy = remote?.canUpdate && !remote.indexed && ops.pruneEmpties(entries).length;

  return { entries, sync: hasBrowserCopy ? "upload" : null };
}

export function useKeyphrases({
  collectionSlug,
  docId,
  localeCode,
  remote,
}: UseKeyphrasesArgs): UseKeyphrasesApi {
  const key = storageKey(collectionSlug, docId, localeCode);
  const [initial] = useState(() =>
    initialState(key, unsavedStorageKey(collectionSlug, docId, localeCode), remote)
  );
  const [list, setList] = useState<KeyphraseEntry[]>(initial.entries);
  const [saveFailed, setSaveFailed] = useState(false);

  const persistLocally = !remote;
  const apiRoute = remote?.canUpdate ? remote.apiRoute : undefined;
  const saver = useMemo(
    () =>
      apiRoute
        ? createRemoteSaver(
            { apiRoute, collection: collectionSlug, docId, locale: localeCode },
            { onOutcome: (outcome) => setSaveFailed(outcome.status === "failed") }
          )
        : null,
    [apiRoute, collectionSlug, docId, localeCode]
  );

  const pendingSyncRef = useRef<PendingSync>(initial.sync);

  const keyRef = useRef(key);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setList(loadKeyphrases(key));
    }
  }, [key]);

  useEffect(() => {
    if (persistLocally) saveKeyphrases(key, list);
  }, [key, list, persistLocally]);

  useEffect(() => {
    if (!saver) return;

    const flush = () => void saver.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, [saver]);

  const listRef = useRef(list);
  listRef.current = list;
  useEffect(
    () => () => {
      if (!persistLocally) return;

      const pruned = ops.pruneEmpties(listRef.current);
      if (pruned.length !== listRef.current.length) saveKeyphrases(keyRef.current, pruned);
    },
    [persistLocally]
  );

  const replaceList = useCallback((next: KeyphraseEntry[]) => {
    listRef.current = next;
    setList(next);
  }, []);

  const apply = useCallback(
    (op: (current: KeyphraseEntry[]) => KeyphraseEntry[]): KeyphraseEntry[] => {
      const current = listRef.current;
      const next = op(current);
      if (next === current) return current;

      replaceList(next);
      saver?.schedule(next);
      pendingSyncRef.current = null;

      return next;
    },
    [replaceList, saver]
  );

  const addRelated = useCallback((): string | undefined => {
    const current = listRef.current;
    const next = apply(ops.addRelated);

    return next === current ? undefined : next.at(-1)?.id;
  }, [apply]);
  const updateText = useCallback(
    (id: string, text: string) => apply((l) => ops.updateText(l, id, text)),
    [apply]
  );
  const addSynonym = useCallback(
    (id: string, syn: string) => apply((l) => ops.addSynonym(l, id, syn)),
    [apply]
  );
  const removeSynonym = useCallback(
    (id: string, index: number) => apply((l) => ops.removeSynonym(l, id, index)),
    [apply]
  );
  const remove = useCallback((id: string) => apply((l) => ops.remove(l, id)), [apply]);
  const setFocus = useCallback((id: string) => apply((l) => ops.setFocus(l, id)), [apply]);
  const isDuplicate = useCallback(
    (id: string, text: string) => ops.isDuplicate(listRef.current, id, text),
    []
  );
  const uploadBrowserCopy = useCallback(async () => {
    const uploadedKey = keyRef.current;
    const uploaded = listRef.current;
    const outcome = await saver?.save(uploaded, { ifAbsent: true });
    if (!outcome || outcome.status === "failed") return;

    clearKeyphrases(uploadedKey);
    if (outcome.status === "exists" && listRef.current === uploaded) {
      replaceList(entriesOrBlank(outcome.keyphrases));
    }
  }, [replaceList, saver]);
  const retryUnsaved = useCallback(() => {
    saver?.schedule(listRef.current);
    void saver?.flush();
  }, [saver]);
  const syncOnOpen = useCallback(() => {
    const sync = pendingSyncRef.current;
    pendingSyncRef.current = null;

    if (sync === "upload") void uploadBrowserCopy();
    if (sync === "retry") retryUnsaved();
  }, [retryUnsaved, uploadBrowserCopy]);

  return {
    keyphrases: list,
    addRelated,
    updateText,
    addSynonym,
    removeSynonym,
    remove,
    setFocus,
    isDuplicate,
    syncOnOpen,
    readOnly: Boolean(remote && !remote.canUpdate),
    saveFailed,
  };
}
