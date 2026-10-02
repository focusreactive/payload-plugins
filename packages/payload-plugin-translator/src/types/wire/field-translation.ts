/** Stable across rewordings of `message`, which two of these situations share word for word —
 * branch on `reason`, never on the text. */
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

export type FieldTranslationResult =
  | { status: "translated"; value: unknown }
  | { status: "noop"; notice: FieldTranslationNotice };
