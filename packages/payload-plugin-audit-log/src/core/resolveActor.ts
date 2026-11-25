import { ACTOR_TYPES, CTX_ACTOR } from "../constants";
import type {
  AuditActor,
  AuditActorInput,
  AuditActorSource,
  AuditAgentInfo,
  AuditRef,
  AuditVia,
} from "../types";
import { getScopedAuditActor } from "./actorScope";

type UserLike = {
  id?: string | number;
  collection?: string;
  email?: unknown;
  name?: unknown;
  username?: unknown;
  _strategy?: string;
};

export type ReqLike = {
  context?: Record<string, unknown>;
  user?: UserLike | null;
  payloadAPI?: string;
  headers?: Headers;
  payload?: { config?: { routes?: { admin?: string } } };
};

export type ResolvedActor = {
  actor: AuditActor;
  onBehalfOf?: AuditRef;
  agent?: AuditAgentInfo;
  via: AuditVia;
};

const ACTOR_TYPE_SET: ReadonlySet<string> = new Set(ACTOR_TYPES);

const asKnownActorInput = (v: unknown): AuditActorInput | undefined =>
  typeof v === "object" &&
  v !== null &&
  ACTOR_TYPE_SET.has((v as { type?: unknown }).type as string)
    ? (v as AuditActorInput)
    : undefined;

const nonEmptyString = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

export function labelOf(user: UserLike): string | undefined {
  return nonEmptyString(user.email) ?? nonEmptyString(user.name) ?? nonEmptyString(user.username);
}

function userRef(user: UserLike): AuditRef {
  return {
    collection: user.collection,
    docId: user.id === undefined ? undefined : String(user.id),
    label: labelOf(user),
  };
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function isAdminReferer(req: ReqLike): boolean {
  const referer = req.headers?.get("referer");
  if (!referer) return false;
  const base = (req.payload?.config?.routes?.admin ?? "/admin").replace(/\/$/u, "");
  try {
    const { pathname } = new URL(referer);
    return pathname === base || pathname.startsWith(`${base}/`);
  } catch {
    return false;
  }
}

function detectVia(req: ReqLike): AuditVia {
  switch (req.payloadAPI) {
    case "MCP":
      return "mcp";
    case "GraphQL":
      return "graphql";
    case "REST":
      return isAdminReferer(req) ? "admin" : "rest";
    default:
      return "local";
  }
}

function fromInput(
  input: AuditActorInput,
  source: AuditActorSource,
  via: AuditVia,
  user: UserLike | null | undefined
): ResolvedActor {
  const actor = compact({
    type: input.type,
    docId: input.docId === undefined ? undefined : String(input.docId),
    collection: input.collection,
    label: input.label,
    source,
  }) as AuditActor;
  const onBehalfOf = input.onBehalfOf ?? (user ? compact(userRef(user)) : undefined);
  return compact({ actor, onBehalfOf, agent: input.agent, via: input.via ?? via }) as ResolvedActor;
}

export function resolveActor(
  req: ReqLike,
  scoped: AuditActorInput | undefined = getScopedAuditActor()
): ResolvedActor {
  const via = detectVia(req);
  const user = req.user;

  const contextActor = asKnownActorInput(req.context?.[CTX_ACTOR]);
  if (contextActor) return fromInput(contextActor, "context", via, user);
  const scopedActor = asKnownActorInput(scoped);
  if (scopedActor) return fromInput(scopedActor, "als", via, user);

  if (req.payloadAPI === "MCP" || user?._strategy === "mcp-api-key") {
    return compact({
      actor: { type: "agent", source: "auth" } as AuditActor,
      onBehalfOf: user ? compact(userRef(user)) : undefined,
      via: "mcp" as const,
    }) as ResolvedActor;
  }

  if (user) {
    const type = user._strategy === "api-key" ? "api_key" : "user";
    return {
      actor: compact({ type, ...userRef(user), source: "auth" }) as AuditActor,
      via,
    };
  }

  if (req.payloadAPI === "local" || req.payloadAPI === undefined) {
    return { actor: { type: "system", source: "inferred" }, via };
  }
  return { actor: { type: "anonymous", source: "inferred" }, via };
}
