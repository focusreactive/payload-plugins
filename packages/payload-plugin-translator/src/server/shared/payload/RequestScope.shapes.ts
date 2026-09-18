import { APIError } from "payload";

/**
 * The caller's transaction and identity, which Payload carries nowhere ambiently: an operation joins a
 * transaction only when the id is passed under `req` on that call, and sees a user only when one is
 * passed with it.
 *
 * A slice, not the whole `PayloadRequest`: Payload reuses one request object across every document of
 * a bulk update.
 */
export type RequestScope = {
  /** Absent: the operation opens a transaction of its own. */
  transactionID?: string | number;
  /**
   * Who asked. `null` or absent means the request carried no identity — a server-side Local API call,
   * or a job queued before this was recorded — and such work keeps writing with access control off.
   */
  userId?: string | number | null;
  /** A host may have several auth-enabled collections, so {@link userId} alone identifies no row. */
  userCollection?: string | null;
};

/** A fresh carrier per call: `createLocalReq` fills the `req` it is handed in place. */
export function freshReq(scope: RequestScope): { transactionID?: string | number } {
  return scope.transactionID === undefined ? {} : { transactionID: scope.transactionID };
}

/**
 * `collection` is not always on `req.user`: Payload's own auth strategies set it, a host's custom one
 * need not, and `findByID` does not put it on a user the host fetched itself.
 *
 * Filling it in is only safe when one auth-enabled collection exists. With two, `admins:1` and
 * `editors:1` are different people, and guessing would evaluate — and on the deferred path execute —
 * the write as a stranger. An ambiguous request is therefore reported as unattributed.
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

export function authCollectionsOf(payload: {
  config?: { collections?: Array<{ slug: string; auth?: unknown }> };
}): string[] {
  return (payload.config?.collections ?? []).filter((c) => Boolean(c.auth)).map((c) => c.slug);
}

export type Requester = { userId: string | number; userCollection: string };

export function isAttributed(scope: RequestScope): scope is RequestScope & Requester {
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
