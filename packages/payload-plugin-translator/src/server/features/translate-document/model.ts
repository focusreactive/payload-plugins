import type { CollectionSlug, Field } from "payload";
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

/**
 * Map of collection slug to original field schema.
 * Used to access original schemas before Payload sanitization.
 */
export type CollectionSchemaMap = Map<CollectionSlug, Field[]>;
