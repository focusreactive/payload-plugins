import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import { isCollectionAvailable } from "../_lib/collection-utils";

import { GetDocumentStalenessInputSchema } from "./model";
import type { StalenessConfig } from "./model";

/**
 * Reads per-locale staleness for a single document. Best-effort: a recompute failure (e.g. the
 * consumer enabled provenance but has not run the SQL migration, so the sidecar table is missing)
 * degrades to an empty result and a log line — it must never 500 the document panel.
 */
export class GetDocumentStalenessHandler {
  constructor(private readonly config: StalenessConfig) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetDocumentStalenessInputSchema.safeParse(req.routeParams);
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { collection_slug, collection_id } = validationResult.data;
    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    try {
      const service = this.config.provenanceServiceFactory?.(req.payload);
      const locales = service ? await service.getStaleness(collectionSlug, collection_id) : [];
      return ServerResponse.success({ locales });
    } catch (error) {
      req.payload.logger.error({
        err: error,
        collection: collectionSlug,
        documentId: collection_id,
        msg: "translator: failed to compute translation staleness",
      });
      return ServerResponse.success({ locales: [] });
    }
  }
}
