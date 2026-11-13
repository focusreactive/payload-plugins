import { useCollectionTranslationStatus } from "./api/queries/useCollectionTranslationStatus.js";
import { useCancelCollectionTranslations } from "./mutations/useCancelCollectionTranslations.js";
import { useCancelDocumentTranslation } from "./mutations/useCancelDocumentTranslation.js";
import { useDismissStaleness } from "./mutations/useDismissStaleness.js";
import { useQueueDocumentTranslation } from "./mutations/useQueueDocumentTranslation.js";
import { useRunDocumentTranslation } from "./mutations/useRunDocumentTranslation.js";

export { HttpTranslationRepository } from "./api/HttpTranslationRepository.js";
export { TranslationRepositoryProvider } from "./api/TranslationRepositoryContext.js";
export { useTranslateField } from "./mutations/useTranslateField.js";
export { useDocumentTranslationState } from "./queries/useDocumentTranslationState.js";
export { useListTranslationState } from "./queries/useListTranslationState.js";

export { AutoTranslateMarker } from "./ui/AutoTranslateMarker/index.js";

export const TranslationsApi = {
  useRunDocumentTranslation,
  useQueueDocumentTranslation,
  useCancelDocumentTranslation,
  useCollectionTranslationStatus,
  useCancelCollectionTranslations,
  useDismissStaleness,
};

export type {
  DocumentTranslation,
  DocumentTranslationCompleted,
  DocumentTranslationFailed,
  DocumentTranslationPending,
  DocumentTranslationRunning,
  CollectionTranslationStatus,
  CollectionTranslationStatusItem,
  CollectionTranslationPanel,
  ReportedStatus,
  DocumentStaleness,
  StalenessLocale,
} from "./model/types.js";

export { DocumentTranslationStatus } from "./model/enums.js";

export { deriveCollectionPanelStatus, describePanelStatus } from "./model/panelStatus.js";
export type { PanelStatus, MarkerTone } from "./model/panelStatus.js";
export { PanelStatusMarker } from "./ui/PanelStatusMarker/index.js";
export { ActionButton } from "./ui/ActionButton/index.js";

export type { DocumentAddress } from "./model/TranslationRepository.js";
export { localeRowOf, treeModeOf } from "./model/localeRow.js";
export type { LocaleRow } from "./model/localeRow.js";
export { documentPanelStatus, hasLiveRun } from "./model/documentPanelStatus.js";
export { documentEnqueue } from "./model/documentEnqueue.js";
export type { TranslationScope } from "./model/documentEnqueue.js";
export {
  allAddresses,
  filterTree,
  initialSelection,
  selectedInTreeOrder,
  toggleNode,
} from "./model/fieldSelection.js";
export { LocaleStatus } from "./ui/LocaleStatus/index.js";
export { FieldTree } from "./ui/FieldTree/index.js";
export type { LocaleChoice } from "./model/localeChoices.js";
export { listChipOf } from "./model/listChip.js";
export type { ListChip } from "./model/listChip.js";
export {
  batchOf,
  batchSummary,
  collectionEnqueue,
  liveDocumentsOf,
} from "./model/collectionBatch.js";
export { viewIdsKey } from "./queries/translationKeys.js";
