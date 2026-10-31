import type { Endpoint, User } from "payload";

import { getTree } from "../core/siteTree.js";
import type { ResolvedOptions } from "../types.js";
import {
  isRecord,
  parseBoolean,
  parseFolderReference,
  parseLocale,
  parseQueryString,
  parseWholeNumber,
} from "./request.js";

/**
 * `GET /api/folders-tree/tree?root=&depth=&locale=&draft=&includeEmptyFolders=` answers
 * `{ nodes: TreeNode[] }` (spec section 10.2): the site's folders and pages nested and in order,
 * as the requesting user may read them. Anonymous requests see published pages only, and no folder
 * without one. `root` is a folder id, or absent for the whole site.
 */
export const buildTreeEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const root = parseQueryString(query.root, "root");

    const nodes = await getTree(payload, {
      depth: parseWholeNumber({ label: "depth", maximum: 20, minimum: 0, value: query.depth }),
      draft: parseBoolean(query.draft, "draft"),
      includeEmptyFolders: parseBoolean(query.includeEmptyFolders, "includeEmptyFolders"),
      locale: parseLocale(payload, query.locale),
      root:
        root === undefined || root === "root"
          ? null
          : parseFolderReference(payload, options, root, "root"),
      user: (req.user as User | null) ?? null,
    });

    return Response.json({ nodes });
  },
  method: "get",
  path: "/folders-tree/tree",
});
