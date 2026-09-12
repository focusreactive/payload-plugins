/**
 * Why the endpoint declined to translate, for code rather than for a reader. `message` is the
 * sentence shown to an editor and may be reworded at any time; these values may not — two of the
 * five situations carry the same sentence word for word, so this is the only thing that tells
 * them apart.
 *
 * - `block-unresolved` — the path descends into `blocks` and the saved document does not say
 *   which block sits at that position.
 * - `localized-list` — the path descends through a **localized** `blocks` or `array`, whose order
 *   is its own per locale, so a positional path cannot be matched across them.
 * - `not-translatable` — the path lands on a field whose type this plugin does not translate.
 * - `excluded` — the field opted out via `withFieldTranslation({ exclude: true })`.
 * - `nothing-translatable` — the subtree resolved, but held no translatable text: an empty value,
 *   or one whose leaves are all excluded or not localized.
 */
export type FieldTranslationReason =
  | "block-unresolved"
  | "localized-list"
  | "not-translatable"
  | "excluded"
  | "nothing-translatable";

export type FieldTranslationNotice = {
  level: "info" | "warning";
  reason: FieldTranslationReason;
  message: string;
};

/**
 * Successful response. Never an error for "couldn't translate": a field with no
 * localized content (or a path our resolver can't handle yet) is a `noop` with a
 * calm notice, not an HTTP error.
 */
export type FieldTranslationResult =
  | { status: "translated"; value: unknown }
  | { status: "noop"; value: unknown; notice: FieldTranslationNotice };
