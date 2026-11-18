import type { Access, CollectionConfig, Endpoint, GlobalConfig, Plugin } from "payload";

interface RoleScopeOptions {
  /** The user role this scope applies to. */
  role: string;
  /** Collections the role works in as usual. Every other collection is hidden from it and read-only for it. */
  collections: string[];
  /**
   * Collections from `collections` the role keeps its access to but does not see in the nav or on
   * the dashboard, such as `users`, which it reaches only through its own account page.
   */
  hiddenCollections?: string[];
}

type HiddenRule = (args: { user: unknown }) => boolean;

// Payload's own bookkeeping collections, which every signed-in user writes to without seeing them.
const PAYLOAD_CORE_COLLECTIONS = new Set([
  "payload-folders",
  "payload-jobs",
  "payload-kv",
  "payload-locked-documents",
  "payload-migrations",
  "payload-preferences",
  "payload-query-presets",
]);

const COMMENT_PANEL_ENDPOINTS = new Set([
  "/comments-plugin/list",
  "/comments-plugin/unread-mentions-count",
]);

// A slug no collection has, so an empty allow-list still filters instead of matching every comment.
const NO_COLLECTION = "__role-scope-none__";

interface CommentPanelBody {
  collectionSlug?: string | null;
  documentId?: unknown;
  docId?: unknown;
  enabledCollections?: string[];
  enabledGlobals?: string[];
  filterCollectionSlug?: string;
  filterGlobalSlug?: string;
  globalSlug?: string | null;
  mode?: string;
}

const roleOf = (user: unknown): unknown =>
  user && typeof user === "object" && "role" in user
    ? (user as { role?: unknown }).role
    : undefined;

const signedIn: Access = ({ req }) => Boolean(req.user);

function withoutRole(role: string, access: Access | undefined): Access {
  const original = access ?? signedIn;

  return (args) => (roleOf(args.req.user) === role ? false : original(args));
}

// Collections and globals type `hidden` differently; both accept a rule that reads only `user`.
function hiddenFor(role: string, hidden: unknown): HiddenRule {
  return (args) => {
    if (roleOf(args.user) === role) {
      return true;
    }

    return typeof hidden === "function" ? Boolean((hidden as HiddenRule)(args)) : Boolean(hidden);
  };
}

function hideCollection(role: string, collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    admin: { ...collection.admin, hidden: hiddenFor(role, collection.admin?.hidden) },
  };
}

function scopeCollection(role: string, collection: CollectionConfig): CollectionConfig {
  return {
    ...hideCollection(role, collection),
    access: {
      ...collection.access,
      create: withoutRole(role, collection.access?.create),
      delete: withoutRole(role, collection.access?.delete),
      update: withoutRole(role, collection.access?.update),
    },
  };
}

function scopeGlobal(role: string, global: GlobalConfig): GlobalConfig {
  return {
    ...global,
    access: { ...global.access, update: withoutRole(role, global.access?.update) },
    admin: { ...global.admin, hidden: hiddenFor(role, global.admin?.hidden) },
  };
}

function narrowCommentPanelBody(body: CommentPanelBody, collections: string[]): CommentPanelBody {
  const allowed = (body.enabledCollections ?? collections).filter((slug) =>
    collections.includes(slug)
  );
  const narrowed: CommentPanelBody = {
    ...body,
    enabledCollections: allowed.length > 0 ? allowed : [NO_COLLECTION],
    enabledGlobals: [],
  };

  delete narrowed.filterGlobalSlug;

  if (narrowed.filterCollectionSlug && !collections.includes(narrowed.filterCollectionSlug)) {
    delete narrowed.filterCollectionSlug;
    delete narrowed.docId;
  }

  if (
    narrowed.mode === "global-document" ||
    (narrowed.mode === "document" && !collections.includes(narrowed.collectionSlug ?? ""))
  ) {
    narrowed.mode = "global";
  }

  return narrowed;
}

// The comments panel reads every collection and global the client names, bypassing access control.
function scopeCommentPanelEndpoint(
  role: string,
  collections: string[],
  endpoint: Endpoint
): Endpoint {
  return {
    ...endpoint,
    handler: async (req) => {
      if (roleOf(req.user) !== role || !req.json) {
        return endpoint.handler(req);
      }

      const body = (await req.json().catch(() => null)) as CommentPanelBody | null;

      if (body && typeof body === "object") {
        const narrowed = narrowCommentPanelBody(body, collections);

        req.json = () => Promise.resolve(narrowed);
      }

      return endpoint.handler(req);
    },
  };
}

/**
 * Limits one role to a set of collections: everything else disappears from its admin and cannot be
 * changed by it, and the comments panel shows it only comments on those collections. Reading stays
 * as configured, because the public site and relationship pickers read those documents. Payload's
 * own bookkeeping collections are left alone. Add it last, after every plugin that adds
 * collections.
 */
export const roleScopePlugin =
  ({ role, collections, hiddenCollections = [] }: RoleScopeOptions): Plugin =>
  (config) => ({
    ...config,
    collections: config.collections?.map((collection) => {
      if (PAYLOAD_CORE_COLLECTIONS.has(collection.slug)) {
        return collection;
      }

      if (!collections.includes(collection.slug)) {
        return scopeCollection(role, collection);
      }

      return hiddenCollections.includes(collection.slug)
        ? hideCollection(role, collection)
        : collection;
    }),
    endpoints: config.endpoints?.map((endpoint) =>
      COMMENT_PANEL_ENDPOINTS.has(endpoint.path)
        ? scopeCommentPanelEndpoint(role, collections, endpoint)
        : endpoint
    ),
    globals: config.globals?.map((global) => scopeGlobal(role, global)),
  });
