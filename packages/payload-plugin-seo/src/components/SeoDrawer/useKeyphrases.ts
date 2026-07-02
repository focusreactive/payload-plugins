"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as ops from "./keyphraseState";
import type { KeyphraseEntry } from "./keyphraseState";
import { loadKeyphrases, saveKeyphrases, storageKey } from "./keyphraseStorage";

export interface UseKeyphrasesArgs {
  collectionSlug: string;
  docId: string;
  localeCode: string;
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
}

export function useKeyphrases({
  collectionSlug,
  docId,
  localeCode,
}: UseKeyphrasesArgs): UseKeyphrasesApi {
  const key = storageKey(collectionSlug, docId, localeCode);
  const [list, setList] = useState<KeyphraseEntry[]>(() => loadKeyphrases(key));

  const keyRef = useRef(key);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setList(loadKeyphrases(key));
    }
  }, [key]);

  useEffect(() => {
    saveKeyphrases(key, list);
  }, [key, list]);

  const listRef = useRef(list);
  listRef.current = list;
  useEffect(
    () => () => {
      const pruned = ops.pruneEmpties(listRef.current);
      if (pruned.length !== listRef.current.length) saveKeyphrases(keyRef.current, pruned);
    },
    []
  );

  const addRelated = useCallback((): string | undefined => {
    const current = listRef.current;
    const next = ops.addRelated(current);

    if (next === current) return undefined;
    setList(next);

    return next.at(-1)?.id;
  }, []);
  const updateText = useCallback(
    (id: string, text: string) => setList((l) => ops.updateText(l, id, text)),
    []
  );
  const addSynonym = useCallback(
    (id: string, syn: string) => setList((l) => ops.addSynonym(l, id, syn)),
    []
  );
  const removeSynonym = useCallback(
    (id: string, index: number) => setList((l) => ops.removeSynonym(l, id, index)),
    []
  );
  const remove = useCallback((id: string) => setList((l) => ops.remove(l, id)), []);
  const setFocus = useCallback((id: string) => setList((l) => ops.setFocus(l, id)), []);
  const isDuplicate = useCallback(
    (id: string, text: string) => ops.isDuplicate(listRef.current, id, text),
    []
  );

  return {
    keyphrases: list,
    addRelated,
    updateText,
    addSynonym,
    removeSynonym,
    remove,
    setFocus,
    isDuplicate,
  };
}
