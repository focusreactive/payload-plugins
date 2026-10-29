import type { Endpoint } from "payload";

import { getAncestors } from "../core/treeAncestors.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseItemRef,
  parseLocale,
  parseQueryString,
  requireUser,
} from "./request.js";

/**
 * `GET /api/folders-tree/ancestors?collection=pages&id=41` answers `{ folders: [{ id, name,
 * fullPath }] }`, root first (spec section 10.2).
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
        },
        options
      )
    );
  },
  method: "get",
  path: "/folders-tree/ancestors",
});
