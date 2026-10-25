import type { CollectionSlug } from "payload";
import type { ID, RunAsk } from "../../modules/task-runner/types.js";

export type TranslateDocumentInput = RunAsk & {
  collection: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  publishOnTranslation: boolean;
  previousAttempts: number;
};

export type TranslateDocumentOutput = {
  success: true;
};
