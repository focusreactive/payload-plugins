import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { EnqueueAssignment } from "../../modules/task-runner/types.js";
import {
  DocumentIndependentFilterSchema,
  TranslationFilterSchema,
} from "../../../core/domain/selection/index.js";
import type { TranslatableTextPresence } from "../../../core/domain/content-projection/holdsTranslatableText.js";
import type { CollectionCanHoldText } from "../_lib/index.js";

const declaredToBeRefused = (message: string) =>
  z.never({ invalid_type_error: message }).optional();

export const wholeDocumentOnly = (locales: readonly string[]): string =>
  `This collection keeps no drafts, so a translation is written live and Payload refuses a write that leaves a required field empty. Nothing is written yet in ${locales.join(", ")}, so ask for the whole document there: send no \`filters\`.`;

const SAY_IT_IN_FILTERS =
  "Say what the run translates in `filters` — the leaf addresses themselves, or the name of a rule that produces them.";

const ONE_DOCUMENT =
  "This route translates one document, because a leaf address names the one document it was read from. Send a list of documents to the list route.";

const AskedOfEveryRoute = z.object({
  source_lng: z.string().nonempty(),
  target_lng: z.union([z.string().nonempty(), z.array(z.string().nonempty()).min(1)]),
  collection_slug: z.string().nonempty(),
  publish_on_translation: z.boolean().optional().default(false),
  filters: z.array(TranslationFilterSchema).optional(),
  strategy: declaredToBeRefused(`\`strategy\` was removed. ${SAY_IT_IN_FILTERS}`),
  selection: declaredToBeRefused(`\`selection\` was merged into \`filters\`. ${SAY_IT_IN_FILTERS}`),
  criteria: declaredToBeRefused(`\`criteria\` was merged into \`filters\`. ${SAY_IT_IN_FILTERS}`),
});

export type EnqueueAsk = z.infer<typeof AskedOfEveryRoute>;

export const EnqueueDocumentInputSchema = AskedOfEveryRoute.extend({
  collection_id: z.array(z.coerce.string().nonempty()).length(1, { message: ONE_DOCUMENT }),
  select_all: declaredToBeRefused(
    `\`select_all\` is not accepted here, at any value. ${ONE_DOCUMENT}`
  ),
});

export const EnqueueListInputSchema = AskedOfEveryRoute.extend({
  collection_id: z.array(z.coerce.string().nonempty()).nonempty(),
  select_all: z.boolean().optional(),
  filters: z.array(DocumentIndependentFilterSchema).optional(),
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
