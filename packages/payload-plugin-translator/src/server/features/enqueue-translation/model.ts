import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { EnqueueAssignment } from "../../modules/task-runner/types.js";
import { TranslationFilterSchema } from "../../../core/domain/selection/index.js";
import type { TranslatableTextPresence } from "../../../core/domain/content-projection/holdsTranslatableText.js";
import type { CollectionCanHoldText } from "../_lib/index.js";

/**
 * Zod strips a key the schema does not declare, so a member that used to narrow a run has to be
 * declared in order to be refused. Left undeclared, a request asking for less would be answered
 * with a run that overwrites the whole target document.
 */
const refused = (message: string) => z.never({ invalid_type_error: message }).optional();

/**
 * A rule-shaped filter answers every leaf with no readable record, so into an empty locale it
 * writes the whole document; only a named list of leaves can leave a required field empty.
 */
export const wholeDocumentOnly = (locales: readonly string[]): string =>
  `This collection keeps no drafts, so a translation is written live and Payload refuses a write that leaves a required field empty. Nothing is written yet in ${locales.join(", ")}, so ask for the whole document there: send no \`filters\`.`;

const SAY_IT_IN_FILTERS =
  "Say what the run translates in `filters` — the leaf addresses themselves, or the name of a rule that produces them.";

export const EnqueueInputSchema = z.object({
  source_lng: z.string().nonempty(),
  target_lng: z.union([z.string().nonempty(), z.array(z.string().nonempty()).min(1)]),
  collection_slug: z.string().nonempty(),
  collection_id: z.array(z.coerce.string().nonempty()).nonempty(),
  select_all: z.boolean().optional(),
  filters: z.array(TranslationFilterSchema).optional(),
  publish_on_translation: z.boolean().optional().default(false),
  /** See docs/DEPRECATIONS.md#the-strategy-leaves-the-run. */
  strategy: refused(`\`strategy\` was removed. ${SAY_IT_IN_FILTERS}`),
  selection: refused(`\`selection\` was merged into \`filters\`. ${SAY_IT_IN_FILTERS}`),
  criteria: refused(`\`criteria\` was merged into \`filters\`. ${SAY_IT_IN_FILTERS}`),
});

export type EnqueueConfig = {
  availableCollections: Set<CollectionSlug>;
  holdsText: TranslatableTextPresence;
  canHoldText: CollectionCanHoldText;
};

export type EnqueueAssignmentOutput = {
  collection_slug: string;
  collection_id: string;
  target_lng: string;
  handle: string;
};

export const toAssignmentOutputs = (assigned: EnqueueAssignment[]): EnqueueAssignmentOutput[] =>
  assigned.map((entry) => ({
    collection_slug: entry.collectionSlug,
    collection_id: entry.collectionId,
    target_lng: entry.targetLng,
    handle: entry.handle,
  }));
