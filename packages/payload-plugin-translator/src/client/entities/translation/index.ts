import { useCancelCollectionTranslations } from './api/mutations/useCancelCollectionTranslations'
import { useCancelDocumentTranslation } from './api/mutations/useCancelDocumentTranslation'
import { useQueueDocumentTranslation } from './api/mutations/useQueueDocumentTranslation'
import { useRunDocumentTranslation } from './api/mutations/useRunDocumentTranslation'
import { useCollectionTranslationStatus } from './api/queries/useCollectionTranslationStatus'
import { useDocumentTranslation } from './api/queries/useDocumentTranslation'

export { CompletedTranslationStatus } from './ui/CompletedTranslationStatus'
export { FailedTranslationStatus } from './ui/FailedTranslationStatus'
export { RunningTranslationStatus } from './ui/RunningTranslationStatus'

export const TranslationsApi = {
  useRunDocumentTranslation,
  useQueueDocumentTranslation,
  useDocumentTranslation,
  useCancelDocumentTranslation,
  useCollectionTranslationStatus,
  useCancelCollectionTranslations,
}

export { PendingTranslationStatus } from './ui/PendingTranslationStatus'

export type {
  DocumentTranslation,
  DocumentTranslationCompleted,
  DocumentTranslationFailed,
  DocumentTranslationPending,
  DocumentTranslationRunning,
  CollectionTranslationStatus,
  CollectionTranslationStatusItem,
  GroupedCollectionTranslationStatus,
} from './model/types'

export { DocumentTranslationStatus } from './model/enums'
