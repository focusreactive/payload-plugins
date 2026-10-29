import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { reportedRuns } from "../../modules/runs/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { visibleIds } from "../../shared/payload/collections.js";

import { GetCollectionStatusInputSchema } from "./model.js";
import type { GetCollectionStatusConfig } from "./model.js";

/** What a collection is doing: runs in flight, plus failures inside the configured window. */
export class GetCollectionStatusHandler {
  private readonly config: GetCollectionStatusConfig;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(config: GetCollectionStatusConfig, runRecordStoreFactory: RunRecordStoreFactory) {
    this.config = config;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetCollectionStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );

    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const { failedWindowMs } = this.config;
    const store = this.runRecordStoreFactory(req.payload);
    const [live, failed] = await Promise.all([
      store.findLiveInCollection(collectionSlug),
      store.findRecentlyFailedInCollection(collectionSlug, new Date(Date.now() - failedWindowMs)),
    ]);
    const shown = reportedRuns([...live, ...failed]);

    const visible = await visibleIds(
      req.payload,
      collectionSlug,
      shown.map(({ row }) => row.collectionId),
      req.user
    );

    return ServerResponse.success({
      failed_window_ms: failedWindowMs,
      docs: shown
        .filter(({ row }) => visible.has(row.collectionId))
        .map(({ row, status }) => ({
          id: row.handle,
          status,
          collection_id: row.collectionId,
          target_lng: row.targetLng,
        })),
    });
  }
}
