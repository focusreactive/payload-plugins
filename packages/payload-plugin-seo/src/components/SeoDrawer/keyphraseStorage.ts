import { createEntry, pruneEmpties } from "./keyphraseState";
import type { KeyphraseEntry } from "./keyphraseState";
import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import type { StoredKeyphrase } from "../../keyphrases/stored";

const PREFIX = "seo-kw";
const UNSAVED_PREFIX = "seo-kw-unsaved";

export function storageKey(collectionSlug: string, docId: string, locale: string): string {
  return `${PREFIX}:${collectionSlug}:${docId}:${locale}`;
}

export function unsavedStorageKey(collectionSlug: string, docId: string, locale: string): string {
  return `${UNSAVED_PREFIX}:${collectionSlug}:${docId}:${locale}`;
}

function store(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function toEntries(stored: StoredKeyphrase[]): KeyphraseEntry[] {
  return stored.map((k) => createEntry(k.text, k.synonyms));
}

export function toStored(list: KeyphraseEntry[]): StoredKeyphrase[] {
  return pruneEmpties(list).map(({ text, synonyms }) => ({ text, synonyms }));
}

function readStored(key: string): StoredKeyphrase[] | null {
  try {
    const raw = store()?.getItem(key);

    return raw ? sanitizeStoredKeyphrases(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function entriesOrBlank(stored: StoredKeyphrase[]): KeyphraseEntry[] {
  const entries = toEntries(stored);

  return entries.length ? entries : [createEntry()];
}

export function loadKeyphrases(key: string): KeyphraseEntry[] {
  return entriesOrBlank(readStored(key) ?? []);
}

export function loadUnsavedKeyphrases(key: string): KeyphraseEntry[] | null {
  const stored = readStored(key);

  return stored?.length ? toEntries(stored) : null;
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
