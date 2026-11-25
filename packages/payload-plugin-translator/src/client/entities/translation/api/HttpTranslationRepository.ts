import type {
  CancelRequest,
  CancelResponse,
  DismissStalenessRequest,
  EnqueueDocumentRequest,
  EnqueueListRequest,
  EnqueueResponse,
  FieldTranslationRequest,
  WireEnvelope,
} from "../../../../types/wire/ActionBodies.js";
import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import { ENDPOINTS } from "../../../../types/wire/endpoints.js";
import type { EndpointName } from "../../../../types/wire/endpoints.js";
import type { FieldTranslationResult } from "../../../../types/wire/field-translation.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { ApiRequest } from "../../../shared/api/createRequest.js";
import { rejectBusyEnqueue } from "../model/rejectBusyEnqueue.js";
import type {
  CollectionSlug,
  DocumentAddress,
  ListStateRequest,
  TranslationRepository,
} from "../model/TranslationRepository.js";

/** The field route translates synchronously, over a provider budgeted at 60 s in the sandbox. */
export const FIELD_TRANSLATION_TIMEOUT_MS = 90_000;

type PathParamsOf<Path extends string> = Path extends `${string}:${infer Name}/${infer Rest}`
  ? Name | PathParamsOf<`/${Rest}`>
  : Path extends `${string}:${infer Name}`
    ? Name
    : never;

type RouteParams<Name extends EndpointName> = Record<
  PathParamsOf<(typeof ENDPOINTS)[Name]["path"]>,
  string
>;

function route<Name extends EndpointName>(name: Name, params: RouteParams<Name>) {
  const { method, path } = ENDPOINTS[name];
  const values: Record<string, string> = params;
  const filled = path.replace(/:(\w+)/gu, (_, key: string) =>
    encodeURIComponent(values[key] ?? "")
  );
  return { method, path: filled };
}

export class HttpTranslationRepository implements TranslationRepository {
  private readonly request: ApiRequest;

  constructor(request: ApiRequest) {
    this.request = request;
  }

  async getDocumentState({ collection, id }: DocumentAddress): Promise<DocumentTranslationState> {
    const { method, path } = route("documentState", {
      collection_slug: collection,
      collection_id: id,
    });
    const answer = await this.request<WireEnvelope<DocumentTranslationState>>(path, { method });
    return answer.data;
  }

  async getListState({ collection, ids }: ListStateRequest): Promise<ListTranslationState> {
    const { method, path } = route("listState", { collection_slug: collection });
    const answer = await this.request<WireEnvelope<ListTranslationState>>(path, {
      method,
      query: { ids: ids.join(",") },
    });
    return answer.data;
  }

  async enqueueDocument(request: EnqueueDocumentRequest): Promise<EnqueueResponse> {
    return await this.queue("enqueue", request);
  }

  async enqueueList(request: EnqueueListRequest): Promise<EnqueueResponse> {
    return await this.queue("enqueueList", request);
  }

  private async queue(
    endpoint: "enqueue" | "enqueueList",
    body: EnqueueDocumentRequest | EnqueueListRequest
  ): Promise<EnqueueResponse> {
    const { method, path } = route(endpoint, {});
    const answer = await this.request<WireEnvelope<EnqueueResponse>>(path, { method, body });
    return rejectBusyEnqueue(answer.data);
  }

  async cancel({ collection, id }: DocumentAddress): Promise<CancelResponse> {
    return this.sendCancel({ collection_slug: collection, collection_id: [id] });
  }

  async cancelByCollection(collection: CollectionSlug): Promise<void> {
    await this.sendCancel({ collection_slug: collection, select_all: true });
  }

  async runNow({ collection, id }: DocumentAddress): Promise<void> {
    const { method, path } = route("runNow", { collection_slug: collection, collection_id: id });
    await this.request(path, { method });
  }

  async dismissStaleness(request: DismissStalenessRequest): Promise<void> {
    const { method, path } = route("dismissStaleness", {});
    await this.request(path, { method, body: request });
  }

  private async sendCancel(body: CancelRequest): Promise<CancelResponse> {
    const { method, path } = route("cancel", {});
    const answer = await this.request<WireEnvelope<CancelResponse> | undefined>(path, {
      method,
      body,
    });
    return answer?.data ?? { refused: [] };
  }

  async translateField(request: FieldTranslationRequest): Promise<FieldTranslationResult> {
    const { method, path } = route("translateField", {});
    const answer = await this.request<WireEnvelope<FieldTranslationResult>>(path, {
      method,
      body: request,
      timeout: FIELD_TRANSLATION_TIMEOUT_MS,
    });
    return answer.data;
  }
}
