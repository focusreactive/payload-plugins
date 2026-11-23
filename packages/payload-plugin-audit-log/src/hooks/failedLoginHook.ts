import { formatNames, toWords } from "payload";
import type { AfterErrorHook, Payload, PayloadRequest } from "payload";
import { MAX_LOGIN_IDENTIFIER_LENGTH } from "../constants";
import { recordAuditEventOutsideTransaction } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import { failOpen } from "../utils/failOpen";

type FailedLogin = { slug: string; reason: string };

type AuthCollectionConfig = {
  slug: string;
  auth?: boolean | { disableLocalStrategy?: unknown };
  graphQL?: false | { singularName?: string };
};

type GraphQLErrorLike = { path?: readonly unknown[]; originalError?: { name?: string } | null };

type LoginData = { email?: unknown; username?: unknown; variables?: LoginData };

const FAILURE_REASON_BY_ERROR: Record<string, string> = {
  AuthenticationError: "invalid_credentials",
  LockedAuth: "locked",
};

const isLoginPath = (url: string | undefined): boolean => {
  try {
    return new URL(url ?? "http://x/").pathname.endsWith("/login");
  } catch {
    return false;
  }
};

const hasLoginMutation = (config: AuthCollectionConfig): boolean =>
  Boolean(config.auth) &&
  config.graphQL !== false &&
  !(typeof config.auth === "object" && config.auth.disableLocalStrategy);

const loginMutationName = (config: AuthCollectionConfig): string => {
  const singularName = config.graphQL ? config.graphQL.singularName : undefined;
  return `login${singularName ? toWords(singularName, true) : formatNames(config.slug).singular}`;
};

const loginMutationsByCollections = new WeakMap<object, Map<string, string>>();

function collectionSlugByLoginMutation(payload: Payload): Map<string, string> {
  const collections = payload.collections as unknown as Record<
    string,
    { config?: AuthCollectionConfig } | undefined
  >;
  const cached = loginMutationsByCollections.get(collections);
  if (cached) return cached;
  const slugByMutation = new Map<string, string>();
  for (const entry of Object.values(collections ?? {})) {
    const config = entry?.config;
    if (config && hasLoginMutation(config))
      slugByMutation.set(loginMutationName(config), config.slug);
  }
  loginMutationsByCollections.set(collections, slugByMutation);
  return slugByMutation;
}

function failedGraphQLLogin(error: unknown, payload: Payload): FailedLogin | undefined {
  const { originalError, path } = error as GraphQLErrorLike;
  const reason = FAILURE_REASON_BY_ERROR[originalError?.name ?? ""];
  const mutation = path?.[0];
  if (!reason || typeof mutation !== "string" || !mutation.startsWith("login")) return undefined;
  const slug = collectionSlugByLoginMutation(payload).get(mutation);
  return slug ? { slug, reason } : undefined;
}

function failedRestLogin(
  error: Error,
  url: string | undefined,
  slug: string
): FailedLogin | undefined {
  const reason = FAILURE_REASON_BY_ERROR[error.name];
  return reason && isLoginPath(url) ? { slug, reason } : undefined;
}

function detectFailedLogin(
  error: Error,
  req: PayloadRequest,
  collectionSlug: string | undefined
): FailedLogin | undefined {
  if (collectionSlug) return failedRestLogin(error, req.url, collectionSlug);
  if (req.payloadAPI === "GraphQL") return failedGraphQLLogin(error, req.payload);
  return undefined;
}

const submittedLogin = (data: LoginData | undefined): string | undefined => {
  const credentials = data?.variables ?? data;
  const identifier = [credentials?.email, credentials?.username].find(
    (value): value is string => typeof value === "string" && value !== ""
  );
  return identifier?.slice(0, MAX_LOGIN_IDENTIFIER_LENGTH);
};

export function buildFailedLoginHook(opts: ResolvedOptions): AfterErrorHook {
  const recordFailedLogin = async (
    error: Error,
    req: PayloadRequest,
    collectionSlug: string | undefined
  ) => {
    const failure = detectFailedLogin(error, req, collectionSlug);
    if (!failure) return;
    const label = submittedLogin(req.data as LoginData | undefined);
    await recordAuditEventOutsideTransaction(req, opts, {
      action: "auth.login_failed",
      status: "failure",
      target: { kind: "auth", slug: failure.slug },
      metadata: { reason: failure.reason },
      localized: false,
      actorOverride: {
        actor: { type: "anonymous", source: "inferred", ...(label ? { label } : {}) },
      },
    });
  };

  return async ({ error, req, collection }) => {
    if (!req) return;
    await failOpen(req.payload, "could not record the failed login", () =>
      recordFailedLogin(error, req, collection?.slug)
    );
  };
}
