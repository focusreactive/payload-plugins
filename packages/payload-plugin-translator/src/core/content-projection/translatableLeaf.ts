/**
 * The single definition of "which leaf is translatable, and what its source text is" — shared by
 * the read-only {@link projectTranslatableContent} (for the provenance fingerprint) and the
 * translation pipeline's `FieldChunkCollector`, so the two can never disagree on the translatable
 * set (slice 6 design, option B, `docs/plans/2026-06-30-slice6-contentprojector-idpath-design.md`).
 *
 * Payload-free (structural {@link FieldLike} + owned `Serialized*` views only) so it can move to
 * `@repo/translator-core` unchanged.
 */

import { isFieldExcludedFromTranslation } from "../field-config";
import type { FieldLike, LeafFieldLike } from "../kernel/field-traversal/types";
import { collectSerializedLexicalTextNodes } from "../kernel/lexical/collectTextNodes";
import { isSerializedLexicalRoot } from "../kernel/lexical/guards";

/** The field types this package translates (mirrors `isTranslatableField`, payload-free). */
const isTranslatableFieldType = (field: { type: string }): boolean =>
  field.type === "text" || field.type === "textarea" || field.type === "richText";

/** Mirrors `isLocalizedField` structurally. */
const isLocalizedFieldLike = (field: { localized?: boolean }): boolean => field.localized === true;

/**
 * The leaf-SELECTION decision shared by projection and translation: a leaf is a translation target
 * iff it is a translatable text type, localized, and not excluded via `custom.translateKit`.
 * Independent of the value present — the value governs whether there is text to emit, not selection.
 */
export const isTranslatableLeaf = (field: FieldLike | LeafFieldLike): boolean =>
  isTranslatableFieldType(field) &&
  isLocalizedFieldLike(field) &&
  !isFieldExcludedFromTranslation(field);

/**
 * The shared notion of a leaf's translatable source text, at PROJECTION (field-level) granularity:
 * - `richText` → the normalized join of its non-empty Lexical text nodes (the same nodes the
 *   pipeline expands per-node for write-back), trimmed; `null` when it holds no text.
 * - plain `text`/`textarea` → the trimmed string; `null` when empty or not a string.
 *
 * Returns `null` (rather than `""`) for "no translatable text", so callers uniformly skip it.
 */
export const leafSourceText = (field: { type: string }, value: unknown): string | null => {
  if (field.type === "richText") {
    if (!isSerializedLexicalRoot(value)) return null;
    const text = collectSerializedLexicalTextNodes(value.root)
      .map((ref) => ref.node.text)
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
