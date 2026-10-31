import type { Endpoint, User } from "payload";

import { resolvePath } from "../core/resolve.js";
import {
  badRequest,
  isRecord,
  parseBoolean,
  parseLocale,
  parseQueryString,
  parseWholeNumber,
} from "./request.js";

/**
 * `GET /api/folders-tree/resolve?path=&locale=&draft=&depth=` answers a `ResolveResult` (spec
 * section 10.2): 200 for a page and for a redirect, 404 for `notFound`. It is the public lookup of
 * a frontend, so an anonymous request is fine: it reads published pages the way a visitor may.
 * `draft=true` only counts for a signed-in user.
 */
export const buildResolveEndpoint = (): Endpoint => ({
  handler: async (req) => {
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const path = parseQueryString(query.path, "path");
    if (path === undefined) {
      throw badRequest("`path` is required");
    }

    const result = await resolvePath(payload, {
      depth: parseWholeNumber({ label: "depth", maximum: 10, minimum: 0, value: query.depth }),
      draft: parseBoolean(query.draft, "draft"),
      locale: parseLocale(payload, query.locale),
      path,
      user: (req.user as User | null) ?? null,
    });

    return Response.json(result, { status: result.type === "notFound" ? 404 : 200 });
  },
  method: "get",
  path: "/folders-tree/resolve",
});
