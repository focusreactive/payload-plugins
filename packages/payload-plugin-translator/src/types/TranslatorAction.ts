/**
 * What a request asks the translator to do, as passed to `AccessGuard.check`. Members are added in
 * minor releases; an action a guard does not answer `true` to is refused.
 *
 * `cancel-by-collection` is asked by no route since `cancel` took `select_all`. It is kept so a
 * guard written against 1.0 keeps working — see docs/DEPRECATIONS.md#cancel-by-collection-route.
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
