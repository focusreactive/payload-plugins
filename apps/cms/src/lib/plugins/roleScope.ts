import type { Access, CollectionConfig, GlobalConfig, Plugin } from "payload";

interface RoleScopeOptions {
  /** The user role this scope applies to. */
  role: string;
  /** Collections the role works in as usual. Every other collection is hidden from it and read-only for it. */
  collections: string[];
}

type HiddenRule = (args: { user: unknown }) => boolean;

const SYSTEM_PREFIX = "payload-";

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

function scopeCollection(role: string, collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    access: {
      ...collection.access,
      create: withoutRole(role, collection.access?.create),
      delete: withoutRole(role, collection.access?.delete),
      update: withoutRole(role, collection.access?.update),
    },
    admin: { ...collection.admin, hidden: hiddenFor(role, collection.admin?.hidden) },
  };
}

function scopeGlobal(role: string, global: GlobalConfig): GlobalConfig {
  return {
    ...global,
    access: { ...global.access, update: withoutRole(role, global.access?.update) },
    admin: { ...global.admin, hidden: hiddenFor(role, global.admin?.hidden) },
  };
}

/**
 * Limits one role to a set of collections: everything else disappears from its admin and cannot be
 * changed by it. Reading stays as configured, because the public site and relationship pickers read
 * those documents. Payload's own system collections are left alone. Add it last, after every plugin
 * that adds collections.
 */
export const roleScopePlugin =
  ({ role, collections }: RoleScopeOptions): Plugin =>
  (config) => ({
    ...config,
    collections: config.collections?.map((collection) =>
      collections.includes(collection.slug) || collection.slug.startsWith(SYSTEM_PREFIX)
        ? collection
        : scopeCollection(role, collection)
    ),
    globals: config.globals?.map((global) => scopeGlobal(role, global)),
  });
