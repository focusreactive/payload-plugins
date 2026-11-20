import type {
  Access,
  AccessArgs,
  CollectionConfig,
  GlobalConfig,
  Plugin,
  TypedUser,
  Where,
} from "payload";

import { isEditor } from "@/lib/access";

export type EditorOperation = "create" | "read" | "update" | "delete";

export interface EditorScope {
  /** Show the entity in the editor's admin sidebar and allow its admin URLs. Default: false. */
  navigation?: boolean;
  /**
   * Operations the editor may attempt. Each one still runs the entity's own access function,
   * so the role must also be granted there — this layer only ever narrows access.
   */
  operations: readonly EditorOperation[];
  /** Extra row-level constraint for the editor, ANDed with the entity's own result. */
  where?: (user: TypedUser) => Where;
}

export interface RestrictEditorAccessOptions {
  /** Collections the editor may use. Every collection not listed is hidden and fully denied. */
  collections: Record<string, EditorScope>;
  /** Globals the editor may use. Every global not listed is hidden and fully denied. */
  globals?: Record<string, EditorScope>;
}

type HiddenFn = (args: { user: unknown }) => boolean;
type AccessMap = Record<string, unknown>;

const DENIED: EditorScope = { operations: [] };

// Access keys that are not CRUD map onto the CRUD operation they extend. `admin` (panel login,
// users collection only) is never touched: the editor must still be able to sign in.
const OPERATION_BY_ACCESS_KEY: Record<string, EditorOperation> = {
  create: "create",
  delete: "delete",
  read: "read",
  readDrafts: "read",
  readVersions: "read",
  unlock: "update",
  update: "update",
};

const COLLECTION_ACCESS_KEYS = ["create", "read", "update", "delete", "readVersions", "unlock"];
const GLOBAL_ACCESS_KEYS = ["read", "update", "readVersions", "readDrafts"];

// Payload's own default when an access function is omitted: any signed-in user.
const defaultAccess: Access = ({ req }) => Boolean(req.user);

const intersect = (result: boolean | Where, where: Where): boolean | Where => {
  if (result === false) return false;
  if (result === true) return where;
  return { and: [result, where] };
};

const restrictForEditor =
  (access: Access, operation: EditorOperation, scope: EditorScope): Access =>
  async (args: AccessArgs) => {
    const { user } = args.req;
    if (!isEditor(user)) return access(args);
    if (!scope.operations.includes(operation)) return false;

    const result = await access(args);
    return scope.where && user ? intersect(result, scope.where(user)) : result;
  };

const restrictAccessMap = (
  access: AccessMap | undefined,
  keys: string[],
  scope: EditorScope
): AccessMap => {
  const restricted: AccessMap = { ...access };

  for (const key of keys) {
    const original = access?.[key];
    restricted[key] = restrictForEditor(
      typeof original === "function" ? (original as Access) : defaultAccess,
      OPERATION_BY_ACCESS_KEY[key],
      scope
    );
  }

  return restricted;
};

const hideFromEditor = (hidden: unknown, scope: EditorScope): HiddenFn => {
  const isHidden = (args: { user: unknown }) =>
    typeof hidden === "function" ? Boolean((hidden as HiddenFn)(args)) : Boolean(hidden);

  // A hidden collection/global is both left out of the nav and refused (404) on its admin
  // routes; relationship/upload drawers still open it, which is how editors pick media.
  return (args) => isHidden(args) || (isEditor(args.user) && !scope.navigation);
};

// Payload runs plugins sorted by `order` (default 0). Some plugins add their collections late
// (e.g. `@payloadcms/plugin-mcp` uses order 10 for its API-key collection), so this one goes last.
const RUN_AFTER_ALL_PLUGINS = 1000;

const restrictCollection = <T extends Pick<CollectionConfig, "access" | "admin">>(
  collection: T,
  scope: EditorScope
): T => ({
  ...collection,
  access: restrictAccessMap(
    collection.access as AccessMap | undefined,
    COLLECTION_ACCESS_KEYS,
    scope
  ),
  admin: { ...collection.admin, hidden: hideFromEditor(collection.admin?.hidden, scope) },
});

/**
 * Confines the `editor` role to an allow-list of collections/globals: everything else is hidden
 * from the editor's admin panel and denied by access control (hiding alone is not security).
 * Other roles and unauthenticated requests keep the entity's original behaviour.
 *
 * Runs after every other plugin, so collections and globals that plugins add are covered too.
 * The folders collection, which Payload only adds while sanitizing, is covered through
 * `folders.collectionOverrides`. Payload's other internal collections (preferences, locked
 * documents, migrations, jobs, kv) are created later still and keep Payload's own access.
 */
export const restrictEditorAccess = ({
  collections,
  globals = {},
}: RestrictEditorAccessOptions): Plugin => {
  const plugin: Plugin = (config) => ({
    ...config,
    collections: config.collections?.map((collection) =>
      restrictCollection(collection, collections[collection.slug] ?? DENIED)
    ),
    folders:
      config.folders === false
        ? false
        : {
            ...config.folders,
            collectionOverrides: [
              ...(config.folders?.collectionOverrides ?? []),
              ({ collection }) =>
                restrictCollection(collection, collections[collection.slug] ?? DENIED),
            ],
          },
    globals: config.globals?.map((global): GlobalConfig => {
      const scope = globals[global.slug] ?? DENIED;

      return {
        ...global,
        access: restrictAccessMap(
          global.access as AccessMap | undefined,
          GLOBAL_ACCESS_KEYS,
          scope
        ),
        admin: { ...global.admin, hidden: hideFromEditor(global.admin?.hidden, scope) },
      };
    }),
  });

  plugin.order = RUN_AFTER_ALL_PLUGINS;

  return plugin;
};
