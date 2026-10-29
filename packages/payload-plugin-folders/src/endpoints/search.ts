import type { Endpoint } from "payload";

import { searchTree } from "../core/treeSearch.js";
import type { ResolvedOptions, TreeStatus } from "../types.js";
import {
  badRequest,
  isRecord,
  parseFolderReference,
  parseLimit,
  parseList,
  parseLocale,
  parseQueryString,
  requireUser,
} from "./request.js";

const statuses: ReadonlySet<string> = new Set(["changed", "draft", "live", "published"]);

/**
 * `GET /api/folders-tree/search?q=&folder=root|<id>&scope=folder|all&locale=&types=&status=&limit=`
 * answers `{ items }` (spec section 10.2): words ANDed, `"a phrase"` exact, a page type's label as
 * a word limits the results to that type. `types` are collection slugs, `status` any of draft,
 * published, changed, live; both take a comma separated list.
 */
export const buildSearchEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};

    const text = parseQueryString(query.q, "q");
    if (text === undefined || text.trim() === "") {
      throw badRequest("`q` is required");
    }
    const folder = parseQueryString(query.folder, "folder") ?? "root";
    const scope = parseQueryString(query.scope, "scope") ?? "folder";
    if (scope !== "folder" && scope !== "all") {
      throw badRequest("`scope` must be folder or all");
    }
    const types = parseList(query.types, "types");
    if (
      types?.some((type) => type !== options.folders.slug && !options.collections[type]) === true
    ) {
      throw badRequest("`types` must name the folders or a page collection of the tree");
    }
    const status = parseList(query.status, "status");
    if (status?.some((entry) => !statuses.has(entry as TreeStatus)) === true) {
      throw badRequest("`status` must be draft, published, changed or live");
    }

    return Response.json(
      await searchTree(
        req,
        {
          folder:
            folder === "root" ? null : parseFolderReference(payload, options, folder, "folder"),
          limit: parseLimit(query.limit),
          locale: parseLocale(payload, query.locale),
          query: text,
          scope,
          status: status as TreeStatus[] | undefined,
          types,
        },
        options
      )
    );
  },
  method: "get",
  path: "/folders-tree/search",
});
