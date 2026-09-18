import { APIError } from "payload";

/**
 * The caller's request, reduced to the two things the translator needs from it and nothing else:
 * which transaction to join, and who is asking.
 *
 * Payload has no ambient transaction — an operation joins one only when the id is passed under `req`
 * on that call — and no ambient user either. Both are available at the boundary (an HTTP route, an
 * `afterChange` hook) and both used to be dropped one line later, which is why a translated write
 * landed with access control switched off.
 *
 * A slice rather than the whole `PayloadRequest`, which is a god type this package keeps out of leaf
 * helpers and which Payload reuses across every document of a bulk update.
 *
 * @since 0.14.0
 */
export type RequestScope = {
  /** Join the caller's transaction. Absent means the operation opens its own. */
  transactionID?: string | number;
  /**
   * Who asked. `null` or absent means the request carried no identity — a server-side Local API call,
   * or a job queued before this was recorded — and such work keeps writing with access control off.
   */
  userId?: string | number | null;
  /**
   * Which auth-enabled collection {@link userId} belongs to. Needed because a host may have more than
   * one, so the id alone does not say who to look up.
   */
  userCollection?: string | null;
};

/** A fresh carrier per call: `createLocalReq` fills the `req` it is handed in place. */
export function freshReq(scope: RequestScope): { transactionID?: string | number } {
  return scope.transactionID === undefined ? {} : { transactionID: scope.transactionID };
}

/**
 * The identity half of a scope, read from a request.
 *
 * `collection` is not always on `req.user`: Payload's own auth strategies set it, a host's custom one
 * need not, and host code passing a user it fetched itself will not — `findByID` does not put the
 * collection on the document it returns.
 *
 * Completing it is only safe when there is one answer. With a single auth-enabled collection there
 * is, and filling it in keeps a signed-in person from reading as anonymous — which would send their
 * write past the permission check entirely. With two, `admins:1` and `editors:1` are different people
 * carrying the same id, and a guess would evaluate the write against a stranger's rights and, on the
 * deferred path, execute it as them. That is worse than either honest alternative, so an ambiguous
 * request is reported as carrying no identity: the behaviour it had before any of this existed, plus
 * a line in the log naming what to fix.
 */
export function identityOf(
  req: { user?: { id?: string | number; collection?: string } | null },
  authCollections: readonly string[],
  logger?: { warn: (obj: unknown) => void }
): Pick<RequestScope, "userId" | "userCollection"> {
  const user = req.user;
  if (!user || user.id == null) return { userId: null, userCollection: null };
  if (user.collection) return { userId: user.id, userCollection: user.collection };

  if (authCollections.length === 1) {
    return { userId: user.id, userCollection: authCollections[0] };
  }

  logger?.warn({
    userId: String(user.id),
    authCollections: [...authCollections],
    msg: "translator: the request carries a user with no `collection`, and this project has more than one auth-enabled collection, so the translation cannot be attributed. It will be written without a permission check, as an unattributed one is. Set `collection` on the user you pass.",
  });
  return { userId: null, userCollection: null };
}

/** The slugs a user could have come from — the only thing that makes a missing one unambiguous. */
export function authCollectionsOf(payload: {
  config?: { collections?: Array<{ slug: string; auth?: unknown }> };
}): string[] {
  return (payload.config?.collections ?? []).filter((c) => Boolean(c.auth)).map((c) => c.slug);
}

/** True when the scope names somebody whose rights the write should be checked against. */
export function isAttributed(scope: RequestScope): boolean {
  return scope.userId != null && scope.userCollection != null;
}

/**
 * Whether this failure has already rolled the caller's transaction back: Payload's `killTransaction`
 * fires from the catch of every operation and rolls back whenever a transaction id is present,
 * without checking whose it is. Rethrowing cannot save the caller's edit — it is already gone — it
 * only stops the translator reporting a save that did not happen.
 *
 * Narrowed to `APIError` because only a Payload operation reaches `killTransaction`; a provider
 * outage throws before any operation runs and leaves the save intact.
 */
export function killedTheCallersTransaction(scope: RequestScope, error: unknown): boolean {
  return scope.transactionID != null && error instanceof APIError;
}
