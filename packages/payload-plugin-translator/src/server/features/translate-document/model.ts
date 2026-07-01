import type { CollectionSlug } from "payload";
import type { ID } from "../../modules/task-runner/types";
import type { TranslationStrategyName } from "../../modules/translation-pipeline/strategies";

/**
 * Input for the translate document handler
 */
export type TranslateDocumentInput = {
  collection: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  strategy: TranslationStrategyName;
  publishOnTranslation: boolean;
};

/**
 * Output of the translate document handler
 */
export type TranslateDocumentOutput = {
  success: true;
};
