import { z } from "zod";

import { TranslationFilterSchema } from "../../../../../core/domain/selection/index.js";

/**
 * Every shape this plugin has ever written into a job row, and the readers that turn one into the
 * run it describes.
 *
 * Ledger: docs/DEPRECATIONS.md#jobs-input-collection-field, #jobs-per-locale-task-shape and
 * #the-strategy-leaves-the-stored-run.
 */

const LegacyCollectionSchema = z.object({
  relationTo: z.string().nullish(),
  value: z.union([z.string(), z.number()]).nullish(),
});

const RunTargetSchema = z.object({
  lng: z.string().max(256),
  filters: z.array(TranslationFilterSchema).default([]),
});

const LegacyInputSchema = z.object({
  collection_slug: z.string().nullish(),
  collection_id: z.union([z.string(), z.number()]).nullish(),
  collection: LegacyCollectionSchema.nullish(),
  source_lng: z.string().nullish(),
  target_lng: z.string().nullish(),
  targets: z.array(z.unknown()).nullish(),
  target_lngs: z.array(z.string()).nullish(),
  strategy: z.string().nullish(),
  filters: z.array(z.unknown()).nullish(),
  publish_on_translation: z.boolean().nullish(),
  requester_id: z.union([z.string(), z.number()]).nullish(),
  requester_collection: z.string().nullish(),
});

export type LegacyInput = z.infer<typeof LegacyInputSchema>;

export type LegacyLocale = {
  lng: string;
  filters: z.infer<typeof TranslationFilterSchema>[];
};

/** What a row written in any past shape says the run was about. */
export type LegacyRun = {
  collectionSlug: string;
  collectionId: string;
  sourceLng: string;
  publishOnTranslation: boolean;
  requesterId: string | null;
  requesterCollection: string | null;
  locales: LegacyLocale[];
};

/**
 * `skip_existing` maps to the drift rule — the nearest meaning, not the same one: an empty target
 * whose source stands still is no longer filled. Any other legacy strategy becomes no filter.
 */
const DRIFT_CRITERION = "stale";

function localesOf(input: LegacyInput): LegacyLocale[] {
  if (Array.isArray(input.targets)) {
    return input.targets.flatMap((entry) => {
      const parsed = RunTargetSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  }
  if (Array.isArray(input.target_lngs)) {
    const filters: LegacyLocale["filters"] =
      input.strategy === "skip_existing" ? [{ kind: "rule", name: DRIFT_CRITERION }] : [];
    return input.target_lngs.map((lng) => ({ lng, filters }));
  }
  if (typeof input.target_lng === "string") {
    const filters = (input.filters ?? []).flatMap((entry) => {
      const parsed = TranslationFilterSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
    return [{ lng: input.target_lng, filters }];
  }
  return [];
}

export function readLegacyRun(input: unknown): LegacyRun | null {
  const parsed = LegacyInputSchema.safeParse(input ?? {});
  if (!parsed.success) return null;

  const legacy = parsed.data;
  const collectionSlug = legacy.collection_slug ?? legacy.collection?.relationTo ?? "";
  const rawId = legacy.collection_id ?? legacy.collection?.value;
  const sourceLng = legacy.source_lng ?? "";
  const locales = localesOf(legacy);
  if (!collectionSlug || rawId == null || !sourceLng || locales.length === 0) return null;

  return {
    collectionSlug,
    collectionId: String(rawId),
    sourceLng,
    publishOnTranslation: legacy.publish_on_translation ?? false,
    requesterId: legacy.requester_id == null ? null : String(legacy.requester_id),
    requesterCollection: legacy.requester_collection ?? null,
    locales,
  };
}
