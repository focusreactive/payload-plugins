// zod in `core` relaxes its dependency-free rule, as `SourceFingerprint.ts` already does — decided in
// docs/plans/2026-10-02-per-field-fingerprints.task.md, "Deferred — validation in core".
import { z } from "zod";

/**
 * One answer to "which leaves does this run translate" — either the addresses themselves, or the
 * name of a rule that produces them.
 *
 * A run translates the intersection of every filter it carries, so **no filters means every
 * translatable leaf**, and the order they are written in cannot change the result.
 *
 * `name` stays an opaque string rather than a union of the names there are: whatever answers to it
 * is switched on separately, and a row may outlive it.
 */
export const TranslationFilterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("leaves"), addresses: z.array(z.string().nonempty()).min(1) }),
  z.object({ kind: z.literal("rule"), name: z.string().nonempty() }),
]);

export type TranslationFilter = z.infer<typeof TranslationFilterSchema>;

/** The name of a rule that answers which leaves a run translates — `stale` is the only one today. */
export type RuleName = string;
