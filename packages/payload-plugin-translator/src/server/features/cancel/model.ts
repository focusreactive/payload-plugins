import { z } from "zod";
import type { CollectionSlug } from "payload";

import { DocumentIdSchema } from "../../shared/index.js";

const NAME_THE_DOCUMENTS =
  "Name the documents to cancel in `collection_id`, or raise `select_all` for the whole collection.";

/**
 * What a cancel request names.
 *
 * `select_all` is how the admin says "everything queued here" without listing what it cannot see:
 * the list it holds was fetched before the click, so a run queued since would survive a sweep made
 * from it. It is also the only way to ask with no list at all, which is why `collection_id` is
 * demanded of every other request.
 */
export const CancelInputSchema = z
  .object({
    collection_slug: z.string().nonempty(),
    collection_id: z.array(DocumentIdSchema).default([]),
    select_all: z.boolean().optional(),
  })
  .refine((input) => input.select_all === true || input.collection_id.length > 0, {
    message: NAME_THE_DOCUMENTS,
    path: ["collection_id"],
  });

export type CancelConfig = {
  availableCollections: Set<CollectionSlug>;
};
