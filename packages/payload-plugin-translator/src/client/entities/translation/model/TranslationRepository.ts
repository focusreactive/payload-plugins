import type {
  CancelResponse,
  DismissStalenessRequest,
  EnqueueRequest,
  EnqueueResponse,
  FieldTranslationRequest,
} from "../../../../types/wire/ActionBodies.js";
import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import type { FieldTranslationResult } from "../../../../types/wire/field-translation.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { DocumentId, RunHandle } from "../../../../types/wire/primitives.js";

export type CollectionSlug = string;

export type DocumentAddress = { collection: CollectionSlug; id: DocumentId };

export type ListStateRequest = { collection: CollectionSlug; ids: readonly DocumentId[] };

/**
 * The admin's only way to the translator's server. Each call is one request, and every failure
 * rejects with an `ApiRequestError`.
 */
export interface TranslationRepository {
  /** A locale holding content with no record of a run reads `untracked`, never `empty`. */
  getDocumentState(document: DocumentAddress): Promise<DocumentTranslationState>;

  /** One request for every id; an id the server does not know is absent from the answer. */
  getListState(request: ListStateRequest): Promise<ListTranslationState>;

  /** Rejects with reason `busy` when any requested document already has a live run. */
  enqueue(request: EnqueueRequest): Promise<EnqueueResponse>;

  /** Stops each whole run, on every locale it covers; answers the handles the caller may not stop. */
  cancel(handles: readonly RunHandle[]): Promise<CancelResponse>;

  cancelByCollection(collection: CollectionSlug): Promise<void>;

  /** Starts the whole run now, on every locale it covers. */
  runNow(handle: RunHandle): Promise<void>;

  dismissStaleness(request: DismissStalenessRequest): Promise<void>;

  translateField(request: FieldTranslationRequest): Promise<FieldTranslationResult>;
}
