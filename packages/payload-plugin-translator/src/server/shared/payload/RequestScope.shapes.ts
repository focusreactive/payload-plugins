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
  transactionID?: string | number;
  /** `null` means the request carried no identity — such work writes with access control off. */
  userId?: string | number | null;
  userCollection?: string | null;
};

/** A fresh carrier per call: `createLocalReq` fills the `req` it is handed in place. */
export function freshReq(scope: RequestScope): { transactionID?: string | number } {
  return scope.transactionID === undefined ? {} : { transactionID: scope.transactionID };
}

/**
 * Guessing the collection is only safe when one auth-enabled collection exists: with two,
 * `admins:1` and `editors:1` are different people and the write would run as a stranger.
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
 * Payload's `killTransaction` fires from the catch of every operation and rolls back whenever a
 * transaction id is present, whoever owns it. Narrowed to `APIError` because only a Payload operation
 * reaches it — a provider outage throws before any operation runs.
 */
export function killedTheCallersTransaction(scope: RequestScope, error: unknown): boolean {
  return scope.transactionID != null && error instanceof APIError;
}
