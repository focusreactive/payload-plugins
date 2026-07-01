import { createEntry, pruneEmpties } from './keyphraseState';
import type { KeyphraseEntry } from './keyphraseState';

const PREFIX = "seo-kw";

interface StoredEntry {
  text: string;
  synonyms: string[];
}

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

export function loadKeyphrases(key: string): KeyphraseEntry[] {
  const fallback = () => [createEntry()];
  const s = store();
  if (!s) return fallback();

  try {
    const raw = s.getItem(key);
    if (!raw) return fallback();

    const parsed = JSON.parse(raw) as StoredEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback();

    const list = parsed
      .filter((e) => e && typeof e.text === "string")
      .map((e) =>
        createEntry(
          e.text,
          Array.isArray(e.synonyms) ? e.synonyms.filter((x) => typeof x === "string") : []
        )
      );

    return list.length ? list : fallback();
  } catch {
    return fallback();
  }
}

export function saveKeyphrases(key: string, list: KeyphraseEntry[]): void {
  const s = store();
  if (!s) return;

  try {
    const persistable = pruneEmpties(list).map<StoredEntry>((k) => ({
      text: k.text,
      synonyms: k.synonyms,
    }));

    if (persistable.length === 0) {
      s.removeItem(key);
      return;
    }

    s.setItem(key, JSON.stringify(persistable));
  } catch {
    // quota / serialization — fail soft
  }
}
