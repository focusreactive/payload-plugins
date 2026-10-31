import type { Endpoint } from "payload";

import { getChildren } from "../core/treeChildren.js";
import type { ResolvedOptions } from "../types.js";
import {
  isRecord,
  parseFolderReference,
  parseLimit,
  parseLocale,
  parseQueryString,
  requireUser,
} from "./request.js";

/**
 * `GET /api/folders-tree/children?parent=root|<id>&locale=&limit=&cursor=` answers
 * `{ items, hasMore, nextCursor, revision }` (spec section 10.2): the folders and pages directly
 * inside one folder in tree order, with child counts, status and the user's access per row.
 */
export const buildChildrenEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const parent = parseQueryString(query.parent, "parent") ?? "root";

    const result = await getChildren(
      req,
      {
        cursor: parseQueryString(query.cursor, "cursor"),
        limit: parseLimit(query.limit),
        locale: parseLocale(payload, query.locale),
        parent: parent === "root" ? null : parseFolderReference(payload, options, parent, "parent"),
      },
      options
    );

    return Response.json(result);
  },
  method: "get",
  path: "/folders-tree/children",
});
