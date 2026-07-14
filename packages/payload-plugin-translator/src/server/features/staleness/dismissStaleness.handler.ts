import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import { isCollectionAvailable } from "../_lib/collection-utils";

import { DismissStalenessInputSchema } from "./model";
import type { StalenessConfig } from "./model";
import { dismissLocaleStaleness } from "./service";

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

    await dismissLocaleStaleness(
      req.payload,
      this.config,
      collectionSlug,
      collection_id,
      target_lng
    );
    return ServerResponse.success({ success: true });
  }
}
