import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { ProvenanceAccess } from "../../modules/plugin-config/index.js";
import type { TranslatablePaths } from "../_lib/index.js";

export const MOST_IDS_A_PAGE_MAY_ASK_ABOUT = 100;

export const GetListStateInputSchema = z.object({
  collection_slug: z.string().nonempty(),
});

/**
 * Rows answer in the order asked, so a duplicate id drops to its first occurrence.
 */
export const AskedIdsSchema = z
  .string()
  .optional()
  .transform((raw) => [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ])
  .refine((ids) => ids.length <= MOST_IDS_A_PAGE_MAY_ASK_ABOUT, {
    message: `A list read answers about at most ${MOST_IDS_A_PAGE_MAY_ASK_ABOUT} documents; ask for one page at a time.`,
  });

export type GetListStateConfig = {
  availableCollections: Set<CollectionSlug>;
  translatablePaths: TranslatablePaths;
  failedWindowMs: number;
  provenance?: ProvenanceAccess;
};
