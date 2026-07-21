import type { FieldLike } from "../../kernel/field-traversal";
import { projectTranslatableContent } from "./contentProjector";
import { fingerprint } from "./fingerprinter";

/**
 * The staleness baseline: a stable hash of a document's translatable content.
 * `CURRENT = computeSourceFingerprint(sourceDoc, schema)` — the value provenance stores at translation
 * time and #50 recomputes to detect source drift. A named composition of
 * {@link projectTranslatableContent} + {@link fingerprint} so the "how to fingerprint source content"
 * contract lives in one place (callers don't re-wire the two primitives). Reorder-invariant and
 * text-nodes-only, inheriting those properties from its parts.
 *
 * @param doc - The source document to fingerprint (never mutated).
 * @param schema - The ORIGINAL (un-sanitized) field schema.
 * @returns A hex sha256 digest of the projected translatable content.
 * @since 0.7.0
 */
export function computeSourceFingerprint(
  doc: Record<string, unknown>,
  schema: FieldLike[]
): string {
  return fingerprint(projectTranslatableContent(doc, schema));
}
