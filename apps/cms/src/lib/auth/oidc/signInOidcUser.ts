import { withAuditActor } from "@focus-reactive/payload-plugin-audit-log";
import type { AuditActorInput } from "@focus-reactive/payload-plugin-audit-log";
import type { Payload } from "payload";

import { logOidcLogin } from "@/lib/auth/oidc/logOidcLogin";
import { findOrCreateAdminUser } from "@/lib/auth/utils/user";
import type { SSOUserInput } from "@/lib/auth/utils/user";
import type { User } from "@/payload-types";

export const OIDC_PROVISIONING_ACTOR: AuditActorInput = { label: "oidc", type: "system" };

export async function signInOidcUser<Session>(
  payload: Payload,
  claims: SSOUserInput,
  startSession: (user: User) => Promise<Session>,
  headers: Headers
): Promise<{ user: User; session: Session }> {
  const signedIn = await withAuditActor(OIDC_PROVISIONING_ACTOR, async () => {
    const user = await findOrCreateAdminUser(payload, claims);
    return { user, session: await startSession(user) };
  });
  await logOidcLogin(payload, signedIn.user, headers);
  return signedIn;
}
