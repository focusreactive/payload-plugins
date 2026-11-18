import {
  MAX_KEYPHRASES,
  MAX_KEYPHRASE_LENGTH,
  MAX_SYNONYMS,
  MAX_SYNONYM_LENGTH,
} from "../constants";

export interface StoredKeyphrase {
  text: string;
  synonyms: string[];
}

function hasText(value: unknown): value is { text: string; synonyms?: unknown } {
  if (typeof value !== "object" || value === null) return false;

  const { text } = value as { text?: unknown };

  return typeof text === "string" && text.trim() !== "";
}

function sanitizeSynonyms(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();

  return input
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim().slice(0, MAX_SYNONYM_LENGTH))
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, MAX_SYNONYMS);
}

export function sanitizeStoredKeyphrases(input: unknown): StoredKeyphrase[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(hasText)
    .slice(0, MAX_KEYPHRASES)
    .map((entry) => ({
      text: entry.text.trim().slice(0, MAX_KEYPHRASE_LENGTH),
      synonyms: sanitizeSynonyms(entry.synonyms),
    }));
}
