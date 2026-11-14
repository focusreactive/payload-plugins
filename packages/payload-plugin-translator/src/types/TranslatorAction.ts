/**
 * What a request asks the translator to do, as passed to `AccessGuard.check`. Members are added in
 * minor releases; an action a guard does not answer `true` to is refused.
 *
 * @since 1.0.0
 */
export type TranslatorAction =
  | "enqueue"
  | "run"
  | "cancel"
  | "cancel-by-collection"
  | "document-status"
  | "collection-status"
  | "document-staleness"
  | "dismiss-staleness"
  | "translate-field";
