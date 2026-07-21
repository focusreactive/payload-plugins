import { computeSourceFingerprint } from "../content-projection/computeSourceFingerprint";
import type { FieldLike } from "../kernel/field-traversal";

/**
 * Whether a source-locale save actually changed translatable content — the auto-translate drift-gate,
 * in one place. Compares the translatable-content fingerprint of the previous vs the current document
 * (the same hash the provenance write/read path uses via {@link computeSourceFingerprint}), so a save
 * that touched only non-translatable fields never triggers a re-translation.
 *
 * A create (no `previousDoc`) counts as changed: there is nothing to diff against, and the new
 * document's translatable content is by definition not yet translated.
 *
 * Pure and payload-free (sibling of `core/provenance` `isRecordStale`) so the gate is testable without
 * a database; the server hook supplies the two documents Payload already hands to `afterChange` plus
 * the original field schema.
 *
 * @param previousDoc - The source document before this save, or `null`/`undefined` on create.
 * @param nextDoc - The source document after this save.
 * @param schema - The ORIGINAL (un-sanitized) field schema for the collection.
 * @returns `true` when translatable content changed (or on create); `false` when unchanged.
 * @since 0.9.0
 */
export function hasSourceContentChanged(
  previousDoc: Record<string, unknown> | null | undefined,
  nextDoc: Record<string, unknown>,
  schema: FieldLike[]
): boolean {
  if (!previousDoc) return true;
  return (
    computeSourceFingerprint(previousDoc, schema) !== computeSourceFingerprint(nextDoc, schema)
  );
}
