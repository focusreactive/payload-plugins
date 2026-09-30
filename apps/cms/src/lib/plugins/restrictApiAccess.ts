import type { Access, AccessArgs, Plugin, PayloadRequest } from "payload";

export interface RestrictApiAccessOptions {
  /**
   * Upload collections whose files (`/api/<slug>/file/<filename>`) stay public.
   * Only the file itself is exempt; the collection's REST documents still require a session.
   */
  publicFileCollections?: string[];
  /**
   * Globals whose `read` stays public over REST/GraphQL, e.g. data fetched
   * anonymously by the Next.js middleware.
   */
  publicGlobalReads?: string[];
}

// `admin` has a different signature and only gates the admin panel.
const SKIPPED_ACCESS_KEYS = new Set(["admin"]);

const isExternalRequest = (req: PayloadRequest) =>
  req.payloadAPI === "REST" || req.payloadAPI === "GraphQL";

const requireUser =
  (access: Access, { allowStaticFiles = false } = {}): Access =>
  (args: AccessArgs) => {
    const { req, isReadingStaticFile } = args;
    const isPublicFile = allowStaticFiles && isReadingStaticFile === true;

    if (isExternalRequest(req) && !req.user && !isPublicFile) {
      return false;
    }

    return access(args);
  };

const guardAccess = <T extends Record<string, unknown>>(
  access: T | undefined,
  { allowStaticFiles = false, publicKeys = [] as string[] } = {}
): T | undefined => {
  if (!access) {
    // Payload's default access already requires a logged-in user.
    return access;
  }

  const guarded: Record<string, unknown> = { ...access };

  for (const [key, fn] of Object.entries(access)) {
    if (typeof fn !== "function" || SKIPPED_ACCESS_KEYS.has(key) || publicKeys.includes(key)) {
      continue;
    }

    guarded[key] = requireUser(fn as Access, {
      allowStaticFiles: allowStaticFiles && key === "read",
    });
  }

  return guarded as T;
};

/**
 * Denies every collection and global operation reached through the REST or
 * GraphQL API (`/api/<collection>`, `/api/globals/<global>`, `/api/graphql`)
 * unless the request carries an authenticated Payload session.
 *
 * The Local API (`payload.find(...)` etc.) is untouched, so server-rendered
 * pages keep their existing access rules. Register it last so collections and
 * globals added by other plugins are covered too.
 */
export const restrictApiAccess =
  ({ publicFileCollections = [], publicGlobalReads = [] }: RestrictApiAccessOptions = {}): Plugin =>
  (config) => ({
    ...config,
    collections: config.collections?.map((collection) => ({
      ...collection,
      access: guardAccess(collection.access, {
        allowStaticFiles: publicFileCollections.includes(collection.slug),
      }),
    })),
    globals: config.globals?.map((global) => ({
      ...global,
      access: guardAccess(global.access, {
        publicKeys: publicGlobalReads.includes(global.slug) ? ["read"] : [],
      }),
    })),
  });
