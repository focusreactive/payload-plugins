import { CTX_ACTOR } from "@focus-reactive/payload-plugin-audit-log";
import type { AuditActorInput, AuditRef } from "@focus-reactive/payload-plugin-audit-log";
import type { PayloadRequest } from "payload";

import type { PayloadMcpApiKey, User } from "@/payload-types";

import { LOCAL_DEV_MCP_USER } from "./constants/local";

type ActingUser = Pick<User, "id"> & Partial<Pick<User, "email">>;

const onBehalfOf = (user: ActingUser): AuditRef => ({
  collection: "users",
  docId: String(user.id),
  label: user.email,
});

export const LOCAL_DEV_MCP_AUDIT_ACTOR: AuditActorInput = {
  agent: { name: "local-dev-mcp" },
  label: "local-dev-mcp",
  onBehalfOf: onBehalfOf(LOCAL_DEV_MCP_USER),
  type: "agent",
  via: "mcp",
};

export const auditActorOfApiKey = (
  apiKey: Pick<PayloadMcpApiKey, "id" | "label" | "user">
): AuditActorInput => {
  const keyId = String(apiKey.id);
  const label = apiKey.label ?? undefined;
  return {
    agent: { keyId, name: label },
    collection: "payload-mcp-api-keys",
    docId: keyId,
    label,
    ...(typeof apiKey.user === "object" ? { onBehalfOf: onBehalfOf(apiKey.user) } : {}),
    type: "agent",
    via: "mcp",
  };
};

export const actAs = (req: PayloadRequest, actor: AuditActorInput): void => {
  req.context[CTX_ACTOR] = actor;
};
