import { MAX_KEYPHRASES } from "../../constants";

export interface KeyphraseEntry {
  id: string;
  text: string;
  synonyms: string[];
}

function makeId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;

  return c?.randomUUID
    ? c.randomUUID()
    : `kp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createEntry(text = "", synonyms: string[] = []): KeyphraseEntry {
  return {
    id: makeId(),
    text,
    synonyms: [...synonyms],
  };
}

export function addRelated(list: KeyphraseEntry[]): KeyphraseEntry[] {
  if (list.length >= MAX_KEYPHRASES) return list;

  return [...list, createEntry()];
}

export function updateText(list: KeyphraseEntry[], id: string, text: string): KeyphraseEntry[] {
  return list.map((k) => (k.id === id ? { ...k, text } : k));
}

export function addSynonym(list: KeyphraseEntry[], id: string, syn: string): KeyphraseEntry[] {
  const value = syn.trim();
  if (!value) return list;

  return list.map((k) => {
    if (k.id !== id) return k;
    if (k.synonyms.some((s) => s.toLowerCase() === value.toLowerCase())) return k;
    return { ...k, synonyms: [...k.synonyms, value] };
  });
}

export function removeSynonym(list: KeyphraseEntry[], id: string, index: number): KeyphraseEntry[] {
  return list.map((k) =>
    k.id === id ? { ...k, synonyms: k.synonyms.filter((_, i) => i !== index) } : k
  );
}

export function remove(list: KeyphraseEntry[], id: string): KeyphraseEntry[] {
  if (list[0]?.id === id) return list;

  return list.filter((k) => k.id !== id);
}

export function setFocus(list: KeyphraseEntry[], id: string): KeyphraseEntry[] {
  const target = list.find((k) => k.id === id);
  if (!target) return list;

  return [target, ...list.filter((k) => k.id !== id)];
}

export function isDuplicate(list: KeyphraseEntry[], id: string, text: string): boolean {
  const value = text.trim().toLowerCase();
  if (!value) return false;

  return list.some((k) => k.id !== id && k.text.trim().toLowerCase() === value);
}

export function pruneEmpties(list: KeyphraseEntry[]): KeyphraseEntry[] {
  return list.filter((k) => k.text.trim() !== "");
}
