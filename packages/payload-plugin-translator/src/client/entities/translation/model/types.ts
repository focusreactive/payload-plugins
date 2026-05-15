import type { DocumentTranslationStatus } from "./enums";

interface InputData {
  source_lng: string;
  target_lng: string;
}

export interface DocumentTranslationPending {
  id: string;
  status: DocumentTranslationStatus.PENDING;
  created_at: string;
  updated_at: string;
  input: InputData;
}

export interface DocumentTranslationFailed {
  id: string;
  status: DocumentTranslationStatus.FAILED;
  created_at: string;
  updated_at: string;
  input: InputData;
  error: {
    message: string;
  };
}

export interface DocumentTranslationRunning {
  id: string;
  status: DocumentTranslationStatus.RUNNING;
  created_at: string;
  updated_at: string;
  input: InputData;
}

export interface DocumentTranslationCompleted {
  id: string;
  status: DocumentTranslationStatus.COMPLETED;
  created_at: string;
  updated_at: string;
  completed_at: string;
  input: InputData;
}

export type DocumentTranslation =
  | DocumentTranslationCompleted
  | DocumentTranslationRunning
  | DocumentTranslationFailed
  | DocumentTranslationPending
  | null;

export interface CollectionTranslationStatusItem {
  id: string;
  status: DocumentTranslationStatus;
}

export interface CollectionTranslationStatus {
  docs: Array<CollectionTranslationStatusItem>;
}

export type GroupedCollectionTranslationStatus = Record<
  DocumentTranslationStatus,
  CollectionTranslationStatusItem[]
>;
