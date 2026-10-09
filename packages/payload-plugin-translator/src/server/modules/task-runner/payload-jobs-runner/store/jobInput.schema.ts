import { z } from "zod";

/**
 * What a translation run stores in its job row — the one declaration of those fields.
 *
 * The stored types are inferred from here and the `Field[]` Payload is registered with is generated
 * from here, so a field added once reaches both.
 *
 * `strategy` is a bounded string rather than the strategy union because that is what the column can
 * hold: a row written by an older version may name a strategy this one no longer has.
 */
export const TaskInputSchema = z.object({
  collection_slug: z.string(),
  collection_id: z.string(),
  source_lng: z.string().max(256),
  target_lng: z.string().max(256),
  strategy: z.string().max(256),
  publish_on_translation: z.boolean().default(false),
});

/**
 * One run covers a document's whole locale list, so the row names the list and each task names one
 * entry of it. Derived from the task's shape rather than written out again — which is also what
 * keeps the two field lists in the order Payload has always been given them.
 */
export const WorkflowInputSchema = TaskInputSchema.omit({ target_lng: true }).extend({
  target_lngs: z.array(z.string()),
  /**
   * Who asked, replayed at run time so the write is checked against their rights rather than
   * nobody's. `null` keeps the old behaviour of writing with access control off.
   */
  requester_id: z.union([z.string(), z.number()]).nullable(),
  requester_collection: z.string().nullable(),
});

/**
 * The document reference a job row carried before those references became ID-agnostic.
 *
 * @deprecated Read-only fallback. See docs/DEPRECATIONS.md#jobs-input-collection-field
 */
export const LegacyCollectionSchema = z.object({
  relationTo: z.string().nullish(),
  value: z.union([z.string(), z.number()]).nullish(),
});

/**
 * A row's input as it comes back out of the database.
 *
 * Everything is optional because the column is `json` and the row may predate any field in it, and
 * an old enough row carries the legacy reference instead of the flat pair.
 */
export const StoredInputSchema = TaskInputSchema.merge(WorkflowInputSchema)
  .partial()
  .extend({ collection: LegacyCollectionSchema.optional() });
