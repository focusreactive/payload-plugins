export type FieldTranslationNotice = { level: "info" | "warning"; message: string };

/**
 * Successful response. Never an error for "couldn't translate": a field with no
 * localized content (or a path our resolver can't handle yet) is a `noop` with a
 * calm notice, not an HTTP error.
 */
export type FieldTranslationResult =
  | { status: "translated"; value: unknown }
  | { status: "noop"; value: unknown; notice: FieldTranslationNotice };
