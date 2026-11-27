// zod in `core` relaxes its dependency-free rule, as `SourceFingerprint.ts` already does — decided in
// docs/plans/2026-10-02-per-field-fingerprints.task.md, "Deferred — validation in core".
import { z } from "zod";

const LeavesFilterSchema = z.object({
  kind: z.literal("leaves"),
  addresses: z.array(z.string().nonempty()).min(1),
});

const RuleFilterSchema = z.object({ kind: z.literal("rule"), name: z.string().nonempty() });

export const TranslationFilterSchema = z.discriminatedUnion("kind", [
  LeavesFilterSchema,
  RuleFilterSchema,
]);

const KINDS_ANSWERED_PER_DOCUMENT = [RuleFilterSchema] as const;

export const DocumentIndependentFilterSchema = z.discriminatedUnion(
  "kind",
  KINDS_ANSWERED_PER_DOCUMENT,
  {
    errorMap: () => ({
      message:
        "A list of documents is narrowed by a rule only: a leaf address names the one document it was read from, so it travels on the single-document route instead.",
    }),
  }
);

export type TranslationFilter = z.infer<typeof TranslationFilterSchema>;

export type RuleName = string;
