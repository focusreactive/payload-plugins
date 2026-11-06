import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import { foldText } from "../../keyphrases/text";
import type { LinkSourceRow } from "../keyphrases/types";
import type { LinkSource } from "./findLinkCandidates";

function phraseKey(phrase: string): string {
  return foldText(phrase).replace(/\s+/gu, " ").trim();
}

function phrasesOf(row: LinkSourceRow): string[] {
  const phrases = sanitizeStoredKeyphrases(row.keyphrases).flatMap((k) => [k.text, ...k.synonyms]);
  const unique = new Map<string, string>();

  for (const phrase of phrases) {
    const key = phraseKey(phrase);
    if (key && !unique.has(key)) unique.set(key, phrase);
  }

  return [...unique.values()];
}

export function toLinkSources(rows: LinkSourceRow[]): LinkSource[] {
  return rows
    .map((row) => ({ collection: row.docCollection, docId: row.docId, phrases: phrasesOf(row) }))
    .filter((source) => source.phrases.length > 0);
}
