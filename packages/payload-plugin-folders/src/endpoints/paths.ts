import type { Endpoint, User } from "payload";

import { getAllPaths, maxPathsPerRequest } from "../core/allPaths.js";
import {
  badRequest,
  isRecord,
  parseBoolean,
  parseLocale,
  parseQueryString,
  parseWholeNumber,
} from "./request.js";

const defaultPathsLimit = 1000;

/**
 * `GET /api/folders-tree/paths?locale=&under=&rootPages=&draft=&limit=&page=` answers
 * `{ docs, hasNextPage, page }` (spec section 10.2): a row per page and locale, published only for
 * a public reader, `limit` rows a page (default 1,000, at most 10,000) and `page` from 1.
 * `locale=all` gives every locale the page is live in.
 */
export const buildPathsEndpoint = (): Endpoint => ({
  handler: async (req) => {
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const locale = parseQueryString(query.locale, "locale");
    const rootPages = parseQueryString(query.rootPages, "rootPages");
    if (rootPages !== undefined && !["exclude", "include", "only"].includes(rootPages)) {
      throw badRequest("`rootPages` must be include, only or exclude");
    }
    const limit =
      parseWholeNumber({
        label: "limit",
        maximum: maxPathsPerRequest,
        minimum: 1,
        value: query.limit,
      }) ?? defaultPathsLimit;
    const page =
      parseWholeNumber({
        label: "page",
        maximum: Number.MAX_SAFE_INTEGER,
        minimum: 1,
        value: query.page,
      }) ?? 1;

    const rows = await getAllPaths(payload, {
      draft: parseBoolean(query.draft, "draft"),
      locale: locale === "all" ? "all" : parseLocale(payload, locale),
      rootPages: rootPages as "exclude" | "include" | "only" | undefined,
      under: parseQueryString(query.under, "under"),
      user: (req.user as User | null) ?? null,
    });
    const start = (page - 1) * limit;

    return Response.json({
      docs: rows.slice(start, start + limit),
      hasNextPage: rows.length > start + limit,
      page,
    });
  },
  method: "get",
  path: "/folders-tree/paths",
});
