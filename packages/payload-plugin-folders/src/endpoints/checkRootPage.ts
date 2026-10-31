import type { Endpoint } from "payload";

import { checkRootPage } from "../core/checkRootPage.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseFolderReference,
  parseItemRef,
  requireUser,
} from "./request.js";

/**
 * `GET /api/folders-tree/check-root?parent=root|<id>&locale=...&exclude=pages:41` answers
 * `{ ok, conflict?: { title, path }, message? }`: whether another page already is, or in its latest
 * version is about to be, the root page of that folder. `exclude` is the page being edited.
 */
export const buildCheckRootPageEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};

    if (typeof query.parent !== "string") {
      throw badRequest("`parent` is required: root or a folder id");
    }
    if (query.locale !== undefined && typeof query.locale !== "string") {
      throw badRequest("`locale` must be a string");
    }
    const parent =
      query.parent === "root"
        ? null
        : parseFolderReference(payload, options, query.parent, "parent");

    let exclude = query.exclude;
    if (typeof exclude === "string") {
      const separator = exclude.lastIndexOf(":");
      exclude = { collection: exclude.slice(0, separator), id: exclude.slice(separator + 1) };
    }

    return Response.json(
      await checkRootPage(req, {
        exclude:
          exclude === undefined ? undefined : parseItemRef(payload, options, exclude, "exclude"),
        locale: query.locale,
        parent,
      })
    );
  },
  method: "get",
  path: "/folders-tree/check-root",
});
