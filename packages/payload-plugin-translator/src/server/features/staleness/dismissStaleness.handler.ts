import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { mayInitiate } from "../../shared/access/permission.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";

import { DismissStalenessInputSchema } from "./model.js";
import type { StalenessConfig } from "./model.js";

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

    const mayDismiss = await mayInitiate({
      payload: req.payload,
      collection: collectionSlug,
      id: collection_id,
      user: req.user,
    });
    if (!mayDismiss) return ServerResponse.forbidden();

    const service = this.config.provenanceServiceFactory(req.payload);
    await service.dismiss(
      {
        collectionSlug: collectionSlug,
        documentId: collection_id,
        targetLocale: target_lng,
      },
      req.user
    );
    return ServerResponse.success({ success: true });
  }
}
