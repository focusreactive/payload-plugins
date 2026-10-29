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

export const folderUpdateAccess: Access = restrictLimitedRole("id", "parent");

/** Only an admin sees the repair action (decision 5): every editor passes the default rule. */
export const adminOnlyRepair = ({ req }: { req: PayloadRequest }): boolean =>
  roleOf(req) === "admin";
