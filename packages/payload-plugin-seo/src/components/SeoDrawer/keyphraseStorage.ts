import { createEntry, pruneEmpties } from "./keyphraseState";
import type { KeyphraseEntry } from "./keyphraseState";
import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import type { StoredKeyphrase } from "../../keyphrases/stored";

const PREFIX = "seo-kw";

export function storageKey(collectionSlug: string, docId: string, locale: string): string {
  return `${PREFIX}:${collectionSlug}:${docId}:${locale}`;
}

function store(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function toEntries(stored: StoredKeyphrase[]): KeyphraseEntry[] {
  return stored.map((k) => createEntry(k.text, k.synonyms));
}

export function toStored(list: KeyphraseEntry[]): StoredKeyphrase[] {
  return pruneEmpties(list).map(({ text, synonyms }) => ({ text, synonyms }));
}

export function loadKeyphrases(key: string): KeyphraseEntry[] {
  const fallback = () => [createEntry()];
  const s = store();
  if (!s) return fallback();

  try {
    const raw = s.getItem(key);
    if (!raw) return fallback();

    const list = toEntries(sanitizeStoredKeyphrases(JSON.parse(raw)));

    return list.length ? list : fallback();
  } catch {
    return fallback();
  }
}

export function saveKeyphrases(key: string, list: KeyphraseEntry[]): void {
  const s = store();
  if (!s) return;

  try {
    const persistable = toStored(list);

    if (persistable.length === 0) {
      s.removeItem(key);
      return;
    }

    s.setItem(key, JSON.stringify(persistable));
  } catch {
    return;
  }
}

export function clearKeyphrases(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    return;
  }
}
