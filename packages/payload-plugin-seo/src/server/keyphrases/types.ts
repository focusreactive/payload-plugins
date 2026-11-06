import type { DocTarget } from "../../keyphrases/docTarget";

export interface DocRef extends DocTarget {
  locale: string;
}

export interface KeyphraseScope {
  collections: string[];
  locales: readonly string[];
}

export interface KeyphraseRow {
  id: string | number;
  docCollection: string;
  docId: string;
  locale: string;
  keyphrases: unknown;
}

export type LinkSourceRow = Pick<KeyphraseRow, "docCollection" | "docId" | "keyphrases">;
