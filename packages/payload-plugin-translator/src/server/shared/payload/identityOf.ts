import type { RequestScope, Requester } from "./RequestScope.shapes.js";
import { asRequester } from "./RequestScope.shapes.js";

/**
 * Who a request is acting as: `nobody` when it carried no user, `unnameable` when it carried one
 * that cannot be placed in an auth collection.
 */
export type Identity =
  | { readonly kind: "named"; readonly requester: Requester }
  | { readonly kind: "nobody" }
  | { readonly kind: "unnameable" };

/**
 * An identity a scope can be built from, named rather than subtracted: a kind added later is not
 * placeable until someone says it is.
 */
export type PlaceableIdentity = Extract<Identity, { kind: "named" | "nobody" }>;

function named(userId: string | number, collection: string): Extract<Identity, { kind: "named" }> {
  return { kind: "named", requester: asRequester(userId, collection) };
}

/**
 * Guessing the collection is only safe when one auth-enabled collection exists: with two,
 * `admins:1` and `editors:1` are different people and the write would run as a stranger.
 */
export function identityOf(
  req: { user?: { id?: string | number; collection?: string } | null },
  authCollections: readonly string[],
  logger?: { warn: (obj: unknown) => void }
): Identity {
  const user = req.user;
  if (!user) return { kind: "nobody" };

  if (user.id == null) {
    logger?.warn({
      msg: "translator: the request carries a user with no `id`, so the translation cannot be attributed and will not be started.",
    });
    return { kind: "unnameable" };
  }

  if (user.collection) return named(user.id, user.collection);

  const only = authCollections.length === 1 ? authCollections[0] : undefined;
  if (only !== undefined) return named(user.id, only);

  logger?.warn({
    userId: String(user.id),
    authCollections: [...authCollections],
    msg: "translator: the request carries a user with no `collection`, and this project has more than one auth-enabled collection, so the translation cannot be attributed and will not be started. Set `collection` on the user you pass.",
  });
  return { kind: "unnameable" };
}

/** The scope an identity acts in. An `unnameable` one has none, so rule it out before calling. */
export function scopeOf(identity: PlaceableIdentity): RequestScope {
  return { requester: identity.kind === "named" ? identity.requester : null };
}

export function authCollectionsOf(payload: {
  config?: { collections?: Array<{ slug: string; auth?: unknown }> };
}): string[] {
  return (payload.config?.collections ?? []).filter((c) => Boolean(c.auth)).map((c) => c.slug);
}
