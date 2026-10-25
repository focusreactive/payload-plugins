/**
 * What a request asks the translator to do, as passed to `AccessGuard.check`. Named for the action,
 * not the route, so moving an endpoint does not change it. New members arrive in minor releases;
 * an action a guard does not answer `true` to is refused.
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
