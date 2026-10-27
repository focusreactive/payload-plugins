import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { visibleIds } from "../../shared/payload/collections.js";

import { reportedRuns } from "../../modules/runs/index.js";

import { GetDocumentStatusInputSchema, latestPerTargetLocale, runToJobStatus } from "./model.js";
import type { GetDocumentStatusConfig } from "./model.js";

/** What each locale of a document is doing. */
export class GetDocumentStatusHandler {
  private readonly config: GetDocumentStatusConfig;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(config: GetDocumentStatusConfig, runRecordStoreFactory: RunRecordStoreFactory) {
    this.config = config;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetDocumentStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { collection_slug, collection_id } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const visible = await visibleIds(req.payload, collectionSlug, [collection_id], req.user);
    if (!visible.has(collection_id)) return ServerResponse.success([]);

    const rows = await this.runRecordStoreFactory(req.payload).findByDocument({
      collectionSlug,
      collectionId: collection_id,
    });

    return ServerResponse.success(latestPerTargetLocale(reportedRuns(rows)).map(runToJobStatus));
  }
}
