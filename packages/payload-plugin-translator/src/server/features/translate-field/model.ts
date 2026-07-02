import { z } from "zod";

import { JobIdSchema } from "../../shared";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslationProvider } from "../../../core/translation-providers";

/**
 * Max serialized size of the value the endpoint will translate — the value read from the
 * source-locale document (the request body no longer carries one; this is from-locale only). The
 * field endpoint is synchronous — it holds the request for the whole translation — so an unbounded
 * payload is a DoS surface. 256 KiB comfortably covers a long `richText` document; still a guard,
 * not yet configurable.
 */
export const MAX_FIELD_VALUE_BYTES = 256 * 1024;

/**
 * Request body for `POST {basePath}/field`. Snake_case to match the other translator routes.
 *
 * Single mode — **from locale**: the server reads the saved document (`doc_id`) in `source_lng`,
 * takes its value at `field_path`, and translates it into `target_lng`. Both `source_lng` and
 * `doc_id` are therefore required (a saved document). `doc_id` reuses {@link JobIdSchema} — the
 * canonical id guard, ID-format-agnostic (string UUID/ObjectId or numeric autoincrement),
 * normalized to a string.
 */
export const FieldTranslationInputSchema = z.object({
  collection_slug: z.string().nonempty(),
  field_path: z.string().nonempty(),
  target_lng: z.string().nonempty(),
  source_lng: z.string().nonempty(),
  doc_id: JobIdSchema,
});

export type FieldTranslationInput = z.infer<typeof FieldTranslationInputSchema>;

/** Handler dependencies — the schema source of truth + the translation backend. */
export type FieldTranslationConfig = {
  schemaMap: CollectionSchemaMap;
  translationProvider: TranslationProvider;
};
