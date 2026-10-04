import type { Payload } from "payload";

import type { User } from "@/payload-types";

/**
 * Sign in for SSO: OIDC claims or legacy OAuth profile
 */
export type SSOUserInput =
  | { email: string; displayName?: string }
  | {
      id: string;
      displayName: string;
      email: string;
      emails?: { value: string; verified?: boolean }[];
      photos?: { value: string }[];
      provider: string;
    };

function normalizeEmailAndName(input: SSOUserInput): {
  email: string;
  displayName: string;
} {
  const email = "emails" in input ? input.email || input.emails?.[0]?.value : input.email;
  if (!email) {
    throw new Error("Email not provided by the provider");
  }
  const displayName =
    "displayName" in input
      ? input.displayName || email.split("@")[0]
      : input.displayName || email.split("@")[0];
  return { displayName, email };
}

/**
 * Finds or creates an admin user based on the SSO (OIDC/OAuth) profile.
 * If the user exists and is admin, returns it.
 * If not exists, creates with role admin. If exists and is not admin, error.
 */
/**
 * Finds the user by email or creates one. The role comes from the IdP groups and is re-applied on
 * every login, so moving someone between Keycloak groups changes their CMS role (§5.9).
 */
export async function findOrCreateSsoUser(
  payload: Payload,
  profile: SSOUserInput,
  role: "admin" | "user" | "author"
): Promise<User> {
  const { email, displayName } = normalizeEmailAndName(profile);

  const existingUsers = await payload.find({
    collection: "users",
    depth: 0,
    limit: 1,
    where: {
      email: {
        equals: email,
      },
    },
  });

  const existingUser = existingUsers.docs[0] as User | undefined;
  if (existingUser) {
    if (existingUser.role === role) {
      return existingUser;
    }
    const updated = await payload.update({
      collection: "users",
      data: { role },
      id: existingUser.id,
    });
    payload.logger.info(`SSO role for ${email}: ${existingUser.role} → ${role}`);
    return updated as User;
  }

  // Payload auth requires a password at create; SSO users get a random one, so they can only sign
  // in through the IdP.
  const randomPassword =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID() + crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const newUser = await payload.create({
    collection: "users",
    data: {
      email,
      name: displayName,
      password: randomPassword,
      role,
    },
  });

  payload.logger.info(`New ${role} created via SSO: ${email}`);

  return newUser as User;
}
