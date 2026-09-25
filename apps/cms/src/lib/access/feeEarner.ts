import type { Access, FieldAccess } from "payload";

import type { User } from "@/payload-types";

/**
 * A fee-earner is a lawyer with a login, not an editor. They look after one
 * profile, the Person their user record is linked to, and every change they make waits in a draft
 * for an editor to publish.
 */
export function isFeeEarner(user: unknown): user is User {
  return Boolean(user && typeof user === "object" && "role" in user && user.role === "feeEarner");
}

export function linkedPersonId(user: unknown): number | null {
  if (!isFeeEarner(user) || !user.person) return null;
  return typeof user.person === "object" ? user.person.id : user.person;
}

export const ownProfile: Access = ({ req: { user } }) => {
  const personId = linkedPersonId(user);
  return personId ? { id: { equals: personId } } : false;
};

// Field-level, so the admin shows these fields read-only to a fee-earner rather than hiding them,
// and an API write to them is dropped instead of rejected.
export const notFeeEarner: FieldAccess = ({ req: { user } }) => !isFeeEarner(user);
