import { useCancelCollectionTranslations } from "./api/mutations/useCancelCollectionTranslations.js";
import { useCancelDocumentTranslation } from "./api/mutations/useCancelDocumentTranslation.js";
import { useDismissStaleness } from "./api/mutations/useDismissStaleness.js";
import { useQueueDocumentTranslation } from "./api/mutations/useQueueDocumentTranslation.js";
import { useRunDocumentTranslation } from "./api/mutations/useRunDocumentTranslation.js";
import { useCollectionTranslationStatus } from "./api/queries/useCollectionTranslationStatus.js";
import { useDocumentStaleness } from "./api/queries/useDocumentStaleness.js";
import { useDocumentTranslation } from "./api/queries/useDocumentTranslation.js";

export { TranslationStatusList } from "./ui/TranslationStatusList/index.js";
export { AutoTranslateMarker } from "./ui/AutoTranslateMarker/index.js";

export const TranslationsApi = {
  useRunDocumentTranslation,
  useQueueDocumentTranslation,
  useDocumentTranslation,
  useDocumentStaleness,
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
  GroupedCollectionTranslationStatus,
  DocumentStaleness,
  StalenessLocale,
} from "./model/types.js";

export { DocumentTranslationStatus } from "./model/enums.js";

export {
  derivePanelStatus,
  deriveCollectionPanelStatus,
  deriveDocumentRunStatus,
  describePanelStatus,
} from "./model/panelStatus.js";
export type { PanelStatus, MarkerTone } from "./model/panelStatus.js";
export { PanelStatusMarker } from "./ui/PanelStatusMarker/index.js";
export { ActionButton } from "./ui/ActionButton/index.js";

export { buildTranslationStatusRows } from "./model/statusRows.js";
export type { TranslationStatusRow, TranslationRowState } from "./model/statusRows.js";
