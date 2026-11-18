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
import type { DocumentId } from "../../../../types/wire/primitives.js";

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

  /** Stops the document's whole run, on every locale it covers. */
  cancel(document: DocumentAddress): Promise<CancelResponse>;

  /** Stops every queued run in the collection, including runs queued after the list was read. */
  cancelByCollection(collection: CollectionSlug): Promise<void>;

  /** Starts the document's whole run now, on every locale it covers; also retries a failed one. */
  runNow(document: DocumentAddress): Promise<void>;

  dismissStaleness(request: DismissStalenessRequest): Promise<void>;

  translateField(request: FieldTranslationRequest): Promise<FieldTranslationResult>;
}
