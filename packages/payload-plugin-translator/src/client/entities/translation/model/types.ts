import type { DocumentTranslationStatus } from "./enums.js";

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
  /** Unset until the job stops retrying, so a row can read `failed` with nothing to show. */
  error?: {
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
 * One row per target locale in the document status feed. Several rows can share one job id — a job
 * carries all of a document's locales.
 */
export type DocumentTranslation =
  | DocumentTranslationCompleted
  | DocumentTranslationRunning
  | DocumentTranslationFailed
  | DocumentTranslationPending;

export type CollectionTranslationStatusItem = { id: string; status: DocumentTranslationStatus };

export type CollectionTranslationStatus = {
  docs: Array<CollectionTranslationStatusItem>;
  failed_window_ms: number;
};

/** What the collection panel reports on: work under way, never work already finished. */
export type ReportedStatus = Exclude<
  DocumentTranslationStatus,
  DocumentTranslationStatus.COMPLETED
>;

/** `counts.failed` reaches back only `failedWindowMs`, not over all time. */
export type CollectionTranslationPanel = {
  counts: Record<ReportedStatus, number>;
  failedWindowMs: number;
};

/** One translated target locale's staleness relative to its source (#50). */
export type StalenessLocale = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
  changed_leaves?: string[];
};

/** Per-locale staleness for a single document. */
export type DocumentStaleness = {
  locales: StalenessLocale[];
};
