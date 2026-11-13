import { StubWorld } from "../../../../server/modules/translation-stub/model/index.js";
import type { WorldLocales } from "../../../../server/modules/translation-stub/model/index.js";
import { SCENARIOS } from "../../../../server/modules/translation-stub/scenarios/index.js";
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
import type { RunHandle } from "../../../../types/wire/primitives.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import { rejectBusyEnqueue } from "../model/rejectBusyEnqueue.js";
import type {
  CollectionSlug,
  DocumentAddress,
  ListStateRequest,
  TranslationRepository,
} from "../model/TranslationRepository.js";

const keyOf = ({ collection, id }: DocumentAddress): string => `${collection}:${id}`;

/**
 * The stub's world behind the repository interface, for tests. Only the given documents exist;
 * every one starts with its target locales empty and no run.
 */
export class InMemoryTranslationRepository implements TranslationRepository {
  private readonly world = new StubWorld(SCENARIOS.empty);
  private readonly known: ReadonlySet<string>;
  private readonly locales: WorldLocales;

  constructor(documents: readonly DocumentAddress[], locales: WorldLocales) {
    this.known = new Set(documents.map(keyOf));
    this.locales = locales;
  }

  async getDocumentState(document: DocumentAddress): Promise<DocumentTranslationState> {
    this.mustExist(document);
    return this.world.documentState(document, this.locales);
  }

  async getListState({ collection, ids }: ListStateRequest): Promise<ListTranslationState> {
    const knownIds = ids.filter((id) => this.known.has(keyOf({ collection, id })));
    return this.world.listState(collection, knownIds, this.locales);
  }

  async enqueue(request: EnqueueRequest): Promise<EnqueueResponse> {
    const targets =
      typeof request.target_lng === "string" ? [request.target_lng] : request.target_lng;
    const { queued, busy, assignments } = this.world.enqueue(
      request.collection_slug,
      request.collection_id,
      targets,
      this.locales
    );
    const answer: EnqueueResponse = { success: true, queued, busy, assignments };
    return rejectBusyEnqueue(answer);
  }

  async cancel(handles: readonly RunHandle[]): Promise<CancelResponse> {
    this.world.cancel(handles);
    return { refused: [] };
  }

  async cancelByCollection(collection: CollectionSlug): Promise<void> {
    this.world.cancelCollection(collection);
  }

  async runNow(handle: RunHandle): Promise<void> {
    const outcome = this.world.runNow(handle);
    if (outcome === "unknown") throw new ApiRequestError("not-found", "Queued task not found");
    if (outcome === "already-running") {
      throw new ApiRequestError("busy", "Translation task is already in progress");
    }
  }

  async dismissStaleness(request: DismissStalenessRequest): Promise<void> {
    const document = { collection: request.collection_slug, id: request.collection_id };
    this.world.dismiss(document, request.target_lng, this.locales);
  }

  async translateField(request: FieldTranslationRequest): Promise<FieldTranslationResult> {
    this.mustExist({ collection: request.collection_slug, id: request.doc_id });
    return {
      status: "noop",
      notice: {
        level: "info",
        reason: "not-translatable",
        message: "The fake does not translate.",
      },
    };
  }

  private mustExist(document: DocumentAddress): void {
    if (!this.known.has(keyOf(document))) {
      throw new ApiRequestError("not-found", `No document ${keyOf(document)}`);
    }
  }
}
