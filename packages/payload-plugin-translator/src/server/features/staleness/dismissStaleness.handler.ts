import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";

import { DismissStalenessInputSchema } from "./model.js";
import type { StalenessConfig } from "./model.js";

/** Dismisses (acknowledges) staleness of one target locale for a document. */
export class DismissStalenessHandler {
  constructor(private readonly config: StalenessConfig) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = DismissStalenessInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { collection_slug, collection_id, target_lng } = validationResult.data;
    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const service = this.config.provenanceServiceFactory?.(req.payload);
    await service?.dismiss({
      collectionSlug: collectionSlug,
      documentId: collection_id,
      targetLocale: target_lng,
    });
    return ServerResponse.success({ success: true });
  }
}
