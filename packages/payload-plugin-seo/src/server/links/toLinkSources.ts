import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import type { LinkSourceRow } from "./sourceRows";
import type { LinkSource } from "./findLinkCandidates";

function phrasesOf(row: LinkSourceRow): string[] {
  return sanitizeStoredKeyphrases(row.keyphrases).flatMap((k) => [k.text, ...k.synonyms]);
}

export function toLinkSources(rows: LinkSourceRow[]): LinkSource[] {
  return rows
    .map((row) => ({ collection: row.docCollection, docId: row.docId, phrases: phrasesOf(row) }))
    .filter((source) => source.phrases.length > 0);
}
