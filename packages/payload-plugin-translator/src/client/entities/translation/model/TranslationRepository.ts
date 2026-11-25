import type {
  CancelResponse,
  DismissStalenessRequest,
  EnqueueDocumentRequest,
  EnqueueListRequest,
  EnqueueResponse,
  FieldTranslationRequest,
} from "../../../../types/wire/ActionBodies.js";
import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import type { FieldTranslationResult } from "../../../../types/wire/field-translation.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { DocumentId } from "../../../../types/wire/primitives.js";

export type CollectionSlug = string;

export type DocumentAddress = { collection: CollectionSlug; id: DocumentId };

export type ListStateRequest = { collection: CollectionSlug; ids: readonly DocumentId[] };

export interface TranslationRepository {
  getDocumentState(document: DocumentAddress): Promise<DocumentTranslationState>;

  getListState(request: ListStateRequest): Promise<ListTranslationState>;

  enqueueDocument(request: EnqueueDocumentRequest): Promise<EnqueueResponse>;

  enqueueList(request: EnqueueListRequest): Promise<EnqueueResponse>;

  cancel(document: DocumentAddress): Promise<CancelResponse>;

  cancelByCollection(collection: CollectionSlug): Promise<void>;

  runNow(document: DocumentAddress): Promise<void>;

  dismissStaleness(request: DismissStalenessRequest): Promise<void>;

  translateField(request: FieldTranslationRequest): Promise<FieldTranslationResult>;
}
