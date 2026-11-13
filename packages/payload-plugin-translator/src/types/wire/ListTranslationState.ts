import type { DocumentId, IsoDateTime, LocaleCode } from "./primitives.js";
import type { RunState } from "./RunState.js";

/** Drift is not shown per row in 1.0, so a row only says whether the locale holds anything. */
export type ListLocaleState = {
  locale: LocaleCode;
  content: { kind: "empty" } | { kind: "filled"; translatedAt: IsoDateTime | null };
  run: RunState | null;
};

export type ListDocumentState = {
  id: DocumentId;
  locales: readonly ListLocaleState[];
};

/** `GET {basePath}/list-state/:collection_slug?ids=a,b,c` — one request for a page of documents. */
export type ListTranslationState = {
  collection: string;
  /** Only the requested ids the server knows; an unknown id is absent, not an error. */
  docs: readonly ListDocumentState[];
};
