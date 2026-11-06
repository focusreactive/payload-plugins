"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import * as ops from "./keyphraseState";
import type { KeyphraseEntry } from "./keyphraseState";
import {
  clearKeyphrases,
  loadKeyphrases,
  saveKeyphrases,
  storageKey,
  toEntries,
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
}

function initialList(key: string, remote?: RemoteKeyphrases): KeyphraseEntry[] {
  if (!remote?.indexed) return loadKeyphrases(key);

  const entries = toEntries(remote.initial);

  return entries.length ? entries : [ops.createEntry()];
}

export function useKeyphrases({
  collectionSlug,
  docId,
  localeCode,
  remote,
}: UseKeyphrasesArgs): UseKeyphrasesApi {
  const key = storageKey(collectionSlug, docId, localeCode);
  const [initial] = useState(() => {
    const entries = initialList(key, remote);
    const pendingUpload = Boolean(
      remote?.canUpdate && !remote.indexed && ops.pruneEmpties(entries).length > 0
    );

    return { entries, pendingUpload };
  });
  const [list, setList] = useState<KeyphraseEntry[]>(initial.entries);

  const persistLocally = !remote;
  const apiRoute = remote?.canUpdate ? remote.apiRoute : undefined;
  const saver = useMemo(
    () =>
      apiRoute
        ? createRemoteSaver({ apiRoute, collection: collectionSlug, docId, locale: localeCode })
        : null,
    [apiRoute, collectionSlug, docId, localeCode]
  );

  const pendingUploadRef = useRef(initial.pendingUpload);

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

    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") saver.flush();
    };

    window.addEventListener("pagehide", saver.flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", saver.flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      saver.flush();
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

  const apply = useCallback(
    (op: (current: KeyphraseEntry[]) => KeyphraseEntry[]): KeyphraseEntry[] => {
      const current = listRef.current;
      const next = op(current);
      if (next === current) return current;

      listRef.current = next;
      setList(next);
      saver?.schedule(next);
      pendingUploadRef.current = false;

      return next;
    },
    [saver]
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
    const saved = await saver?.save(listRef.current, { ifAbsent: true });

    if (saved) clearKeyphrases(uploadedKey);
  }, [saver]);
  const syncOnOpen = useCallback(() => {
    if (!pendingUploadRef.current) return;

    pendingUploadRef.current = false;
    void uploadBrowserCopy();
  }, [uploadBrowserCopy]);

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
  };
}
