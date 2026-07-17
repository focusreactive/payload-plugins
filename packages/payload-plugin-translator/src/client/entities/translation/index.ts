import { useCancelCollectionTranslations } from "./api/mutations/useCancelCollectionTranslations";
import { useCancelDocumentTranslation } from "./api/mutations/useCancelDocumentTranslation";
import { useDismissStaleness } from "./api/mutations/useDismissStaleness";
import { useQueueDocumentTranslation } from "./api/mutations/useQueueDocumentTranslation";
import { useRunDocumentTranslation } from "./api/mutations/useRunDocumentTranslation";
import { useCollectionTranslationStatus } from "./api/queries/useCollectionTranslationStatus";
import { useDocumentStaleness } from "./api/queries/useDocumentStaleness";
import { useDocumentTranslation } from "./api/queries/useDocumentTranslation";

export { TranslationStatusList } from "./ui/TranslationStatusList";
export { AutoTranslateMarker } from "./ui/AutoTranslateMarker";

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
} from "./model/types";

export { DocumentTranslationStatus } from "./model/enums";

export {
  derivePanelStatus,
  deriveCollectionPanelStatus,
  deriveDocumentRunStatus,
  describePanelStatus,
} from "./model/panelStatus";
export type { PanelStatus, MarkerTone } from "./model/panelStatus";
export { PanelStatusMarker } from "./ui/PanelStatusMarker";
export { ActionButton } from "./ui/ActionButton";

export { buildTranslationStatusRows } from "./model/statusRows";
export type { TranslationStatusRow, TranslationRowState } from "./model/statusRows";
