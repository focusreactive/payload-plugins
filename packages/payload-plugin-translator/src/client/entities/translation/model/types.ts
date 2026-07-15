import type { DocumentTranslationStatus } from "./enums";

type InputData = {
  source_lng: string;
  target_lng: string;
};

export type DocumentTranslationPending = {
  id: string;
  status: DocumentTranslationStatus.PENDING;
  created_at: string;
  updated_at: string;
  input: InputData;
};

export type DocumentTranslationFailed = {
  id: string;
  status: DocumentTranslationStatus.FAILED;
  created_at: string;
  updated_at: string;
  input: InputData;
  error: {
    message: string;
  };
};

export type DocumentTranslationRunning = {
  id: string;
  status: DocumentTranslationStatus.RUNNING;
  created_at: string;
  updated_at: string;
  input: InputData;
};

export type DocumentTranslationCompleted = {
  id: string;
  status: DocumentTranslationStatus.COMPLETED;
  created_at: string;
  updated_at: string;
  completed_at: string;
  input: InputData;
};

/**
 * One translation job for a single target locale. The document status feed is an array of these —
 * the latest job per target locale (see `useDocumentTranslation`), because re-translate queues an
 * independent job per locale.
 */
export type DocumentTranslation =
  | DocumentTranslationCompleted
  | DocumentTranslationRunning
  | DocumentTranslationFailed
  | DocumentTranslationPending;

export type CollectionTranslationStatusItem = { id: string; status: DocumentTranslationStatus };

export type CollectionTranslationStatus = {
  docs: Array<CollectionTranslationStatusItem>;
};

export type GroupedCollectionTranslationStatus = Record<
  DocumentTranslationStatus,
  CollectionTranslationStatusItem[]
>;

/** One translated target locale's staleness relative to its source (#50). */
export type StalenessLocale = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
};

/** Per-locale staleness for a single document. */
export type DocumentStaleness = {
  locales: StalenessLocale[];
};
