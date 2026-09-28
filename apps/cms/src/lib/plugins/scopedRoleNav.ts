import type { Plugin } from "payload";

import { roleOf } from "@/lib/access/roles";

const SCOPED_ROLES = new Set(["marketEditor", "feeEarner"]);

// Users stays listed so both roles keep a way to their own account.
const COLLECTIONS_SCOPED_ROLES_WORK_IN = new Set(["person", "insight", "media", "users"]);

type Hidden = boolean | ((args: { user: unknown }) => boolean) | undefined;

function hiddenAlsoFromScopedRoles(hidden: Hidden) {
  if (hidden === true) return true;
  return ({ user }: { user: unknown }) =>
    SCOPED_ROLES.has(roleOf(user) ?? "") || (typeof hidden === "function" && hidden({ user }));
}

/**
 * Payload lists every collection a user can read, so a market editor's or a fee-earner's sidebar was
 * mostly screens that open read-only. This runs last so it also reaches the collections other
 * plugins add. Access is unchanged, and relationship fields still offer hidden collections, so a
 * market editor can still pick a profile's service pages.
 */
export const hideReadOnlyCollectionsFromScopedRoles: Plugin = (config) => ({
  ...config,
  collections: (config.collections ?? []).map((collection) =>
    COLLECTIONS_SCOPED_ROLES_WORK_IN.has(collection.slug)
      ? collection
      : {
          ...collection,
          admin: {
            ...collection.admin,
            hidden: hiddenAlsoFromScopedRoles(collection.admin?.hidden as Hidden),
          },
        }
  ),
  globals: (config.globals ?? []).map((global) => ({
    ...global,
    admin: {
      ...global.admin,
      hidden: hiddenAlsoFromScopedRoles(global.admin?.hidden as Hidden),
    },
  })),
});
