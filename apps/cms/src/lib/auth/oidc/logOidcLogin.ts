import { logAuditEvent } from "@focus-reactive/payload-plugin-audit-log";
import type { Payload } from "payload";

export const logOidcLogin = (payload: Payload, user: { id: string | number; email: string }) =>
  logAuditEvent(payload, {
    action: "auth.login",
    actorOverride: {
      actor: {
        collection: "users",
        docId: String(user.id),
        label: user.email,
        source: "auth",
        type: "user",
      },
      via: "admin",
    },
    metadata: { method: "oidc" },
    target: { docId: String(user.id), kind: "auth", slug: "users" },
  });
