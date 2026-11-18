import { z } from "zod";
import type { CollectionSlug } from "payload";

import { DocumentIdSchema } from "../../shared/index.js";

/** The document whose queued run to start now, read from the route params. */
export const RunInputSchema = z.object({
  collection_slug: z.string().nonempty(),
  collection_id: DocumentIdSchema,
});

export type RunConfig = {
  availableCollections: Set<CollectionSlug>;
};
