import type { Endpoint, User } from "payload";

import { getPathsPage, maxPathsPerRequest } from "../core/allPaths.js";
import {
  badRequest,
  buildReadHeaders,
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
 * a public reader, `limit` pages a request (default 1,000, at most 10,000) and `page` from 1. The
 * database does the paging (`getPathsPage`): collections in the order of the options, by id inside
 * one, so the order is stable between requests but is not path order. `locale=all` gives a row
 * for every locale the page is live in, so `limit` counts pages there and `docs` can hold more
 * rows. Cache headers as `resolve`.
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

    const draft = parseBoolean(query.draft, "draft");
    const answer = await getPathsPage(payload, {
      draft,
      limit,
      locale: locale === "all" ? "all" : parseLocale(payload, locale),
      page,
      rootPages: rootPages as "exclude" | "include" | "only" | undefined,
      under: parseQueryString(query.under, "under"),
      user: (req.user as User | null) ?? null,
    });

    return Response.json(
      { docs: answer.docs, hasNextPage: answer.hasNextPage, page },
      { headers: buildReadHeaders(req, draft) }
    );
  },
  method: "get",
  path: "/folders-tree/paths",
});
