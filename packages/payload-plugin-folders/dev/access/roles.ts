import { buildLiveInLocaleWhere } from "@focus-reactive/payload-plugin-folders/server";
import type { Access, PayloadRequest } from "payload";

type RoleUser = {
  limitedFolder?: { id: number } | number | null;
  role?: string;
} | null;

const roleOf = (req: PayloadRequest): string | undefined => (req.user as RoleUser)?.role;

/**
 * The drafter role may save drafts but not publish. Anything that would make a document live
 * evaluates `update` with `_status: 'published'` (a publish, and a move that changes a published
 * URL, spec section 9), so a collection without drafts, whose rows are always live, refuses a
 * drafter's move too.
 */
export const refuseDrafterPublish: Access = ({ data, req }) =>
  !(roleOf(req) === "drafter" && data?._status === "published");

/** The ids of the folder an `editorLimited` user is tied to, and of every folder beneath it. */
const limitedSubtreeFolderIds = async (req: PayloadRequest): Promise<number[]> => {
  const { limitedFolder } = req.user as NonNullable<RoleUser>;
  const rootId =
    typeof limitedFolder === "object" && limitedFolder ? limitedFolder.id : limitedFolder;
  if (rootId === null || rootId === undefined) {
    return [];
  }
  const { docs } = await req.payload.find({
    collection: "folders",
    depth: 0,
    overrideAccess: true,
    pagination: false,
    // A shallow copy: this runs inside an access check, and a nested call must not change the
    // request's context or locale.
    req: { ...req },
    where: {
      or: [{ id: { equals: rootId } }, { ancestorIds: { contains: `/${rootId}/` } }],
    },
  });

  return docs.map((doc) => doc.id);
};

/**
 * `update` access of the dev app for a signed-in user: everyone may update, except that
 * `editorLimited` may only touch documents inside its folder subtree. The returned `Where` limits
 * which stored documents may change; `data` limits where a document may go: a move names its new
 * `folder` (or `parent`) in `data`, and a target outside the subtree is refused.
 */
export const restrictLimitedRole =
  (stored: "folder" | "id", moved: "folder" | "parent"): Access =>
  async ({ data, req }) => {
    if (!req.user) {
      return false;
    }
    if (roleOf(req) !== "editorLimited") {
      return true;
    }
    const ids = await limitedSubtreeFolderIds(req);
    if (data && moved in data && !ids.some((id) => String(id) === String(data[moved]))) {
      return false;
    }

    return { [stored]: { in: ids } };
  };

export const pageUpdateAccess: Access = async (args) => {
  if (!refuseDrafterPublish(args)) {
    return false;
  }

  return restrictLimitedRole("folder", "folder")(args);
};

/**
 * `update` access of a collection without drafts (the dev `posts`): a save there is live at once
 * and carries no `_status`, so `refuseDrafterPublish` never sees it, and a drafter could change a
 * live URL with a plain `PATCH` (a new slug, or `isFolderRoot`). The drafter may not write in such
 * a collection at all. A host with a "may not publish" role needs the same rule, because the
 * plugin gates its own structural writes (move, rename, root toggle through its endpoints) but a
 * stock save is gated only by `update` and `create`.
 */
export const unversionedUpdateAccess: Access = async (args) => {
  if (roleOf(args.req) === "drafter") {
    return false;
  }

  return restrictLimitedRole("folder", "folder")(args);
};

export const folderUpdateAccess: Access = restrictLimitedRole("id", "parent");

/**
 * `create` access of the dev app: the same limit as `update`, so `editorLimited` may only create
 * inside its folder subtree (the new document names its folder in `data`; a `Where` answer is not
 * meaningful for a create and counts as allowed).
 */
export const pageCreateAccess: Access = restrictLimitedRole("folder", "folder");

/** `create` access of a collection without drafts: see `unversionedUpdateAccess`. */
export const unversionedCreateAccess: Access = async (args) => {
  if (roleOf(args.req) === "drafter") {
    return false;
  }

  return pageCreateAccess(args);
};

export const folderCreateAccess: Access = restrictLimitedRole("id", "parent");

/**
 * `delete` access of the dev app: a drafter deletes nothing (a delete takes live URLs down), and
 * `editorLimited` only what sits inside its folder subtree. The recursive delete (spec section 9)
 * asks this for every document it removes.
 */
const refuseDrafter: Access = ({ req }) => roleOf(req) !== "drafter";

export const pageDeleteAccess: Access = async (args) => {
  if (!refuseDrafter(args)) {
    return false;
  }

  return restrictLimitedRole("folder", "folder")(args);
};

export const folderDeleteAccess: Access = async (args) => {
  if (!refuseDrafter(args)) {
    return false;
  }

  return restrictLimitedRole("id", "parent")(args);
};

/** Only an admin sees the repair action (decision 5): every editor passes the default rule. */
export const adminOnlyRepair = ({ req }: { req: PayloadRequest }): boolean =>
  roleOf(req) === "admin";

/**
 * `read` access of the dev app's page collections for the frontend example (spec section 10.3): a
 * signed-in user reads everything, a visitor only what is live in the locale being read. In a
 * non-default locale that includes a page only the default locale published, which is live there
 * through fallback (decision 24); a plain `_status` check would be evaluated against the locale's
 * own row, which such a page does not have. The default locale and `locale: "all"` keep the plain
 * check.
 */
export const publicReadsPublished: Access = ({ req }) => {
  if (req.user) {
    return true;
  }
  const { localization } = req.payload.config;
  const { locale } = req;
  if (!localization || !locale || locale === "all" || locale === localization.defaultLocale) {
    return { _status: { equals: "published" } };
  }

  return buildLiveInLocaleWhere(req.payload, "pages", locale) ?? true;
};

/** The same for a collection without drafts, whose rows are all live. */
export const publicReadsAll: Access = () => true;
