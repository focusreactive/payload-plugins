import type { DocumentTranslationStatus } from './enums'

type InputData = {
  source_lng: string
  target_lng: string
}

export type DocumentTranslationPending = {
  id: string
  status: DocumentTranslationStatus.PENDING
  created_at: string
  updated_at: string
  input: InputData
}

export type DocumentTranslationFailed = {
  id: string
  status: DocumentTranslationStatus.FAILED
  created_at: string
  updated_at: string
  input: InputData
  error: {
    message: string
  }
}

export type DocumentTranslationRunning = {
  id: string
  status: DocumentTranslationStatus.RUNNING
  created_at: string
  updated_at: string
  input: InputData
}

export type DocumentTranslationCompleted = {
  id: string
  status: DocumentTranslationStatus.COMPLETED
  created_at: string
  updated_at: string
  completed_at: string
  input: InputData
}

export type DocumentTranslation =
  | DocumentTranslationCompleted
  | DocumentTranslationRunning
  | DocumentTranslationFailed
  | DocumentTranslationPending
  | null

export type CollectionTranslationStatusItem = { id: string; status: DocumentTranslationStatus }

export type CollectionTranslationStatus = {
  docs: Array<CollectionTranslationStatusItem>
}

export type GroupedCollectionTranslationStatus = Record<DocumentTranslationStatus, CollectionTranslationStatusItem[]>
