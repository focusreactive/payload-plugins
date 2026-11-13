import type { Endpoint } from "payload";

import { getAncestors } from "../core/treeAncestors.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseBoolean,
  parseItemRef,
  parseLocale,
  parseQueryString,
  requireUser,
} from "./request.js";

/**
 * `GET /api/folders-tree/ancestors?collection=pages&id=41` answers `{ folders: [{ id, name,
 * fullPath }] }`, root first (spec section 10.2). With `withItems=1` the answer also carries
 * `items`, the tree row of each of those folders, and for a folder `item`, its own row: the zoomed
 * tree view builds its breadcrumbs and its drop targets from them.
 */
export const buildAncestorsEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const collection = parseQueryString(query.collection, "collection");
    if (collection === undefined || query.id === undefined) {
      throw badRequest("`collection` and `id` are required");
    }

    return Response.json(
      await getAncestors(
        req,
        {
          item: parseItemRef(payload, options, { collection, id: query.id }, "item"),
          locale: parseLocale(payload, query.locale),
          withItems: parseBoolean(query.withItems, "withItems") ?? false,
        },
        options
      )
    );
  },
  method: "get",
  path: "/folders-tree/ancestors",
});
