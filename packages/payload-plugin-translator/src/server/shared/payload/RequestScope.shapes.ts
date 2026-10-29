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
  requester?: Requester | null;
};

export type Requester = { userId: string | number; userCollection: string } & {
  readonly __brand: "Requester";
};

/**
 * The sole constructor of a {@link Requester}: the brand makes an object literal unassignable, so
 * every producer comes through here.
 *
 * Absent means absent, not falsy — an id of `0` is a real id on a database that counts from zero, and
 * reading it as nobody sends the write past the permission check. A present-but-unusable value (an
 * empty collection) is kept, so the requester lookup fails loudly instead of the write going
 * unattributed.
 */
export function asRequester(userId: string | number, userCollection: string): Requester;
export function asRequester(
  userId: string | number | null | undefined,
  userCollection: string | null | undefined
): Requester | null;
export function asRequester(
  userId: string | number | null | undefined,
  userCollection: string | null | undefined
): Requester | null {
  if (userId == null || userCollection == null) return null;
  return { userId, userCollection } as Requester;
}

/** A fresh carrier per call: `createLocalReq` fills the `req` it is handed in place. */
export function freshReq(scope: RequestScope): { transactionID?: string | number } {
  return scope.transactionID === undefined ? {} : { transactionID: scope.transactionID };
}
