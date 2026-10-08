import type { Requester } from "./RequestScope.shapes.js";
import { asRequester } from "./RequestScope.shapes.js";

/**
 * Guessing the collection is only safe when one auth-enabled collection exists: with two,
 * `admins:1` and `editors:1` are different people and the write would run as a stranger.
 */
export function identityOf(
  req: { user?: { id?: string | number; collection?: string } | null },
  authCollections: readonly string[],
  logger?: { warn: (obj: unknown) => void }
): { requester: Requester | null } {
  const user = req.user;
  if (!user || user.id == null) return { requester: null };
  if (user.collection) return { requester: asRequester(user.id, user.collection) };

  const only = authCollections.length === 1 ? authCollections[0] : undefined;
  if (only !== undefined) return { requester: asRequester(user.id, only) };

  logger?.warn({
    userId: String(user.id),
    authCollections: [...authCollections],
    msg: "translator: the request carries a user with no `collection`, and this project has more than one auth-enabled collection, so the translation cannot be attributed. It will be written without a permission check, as an unattributed one is. Set `collection` on the user you pass.",
  });
  return { requester: null };
}

export function authCollectionsOf(payload: {
  config?: { collections?: Array<{ slug: string; auth?: unknown }> };
}): string[] {
  return (payload.config?.collections ?? []).filter((c) => Boolean(c.auth)).map((c) => c.slug);
}
