import type { Endpoint } from "payload";

import { checkSegment } from "../core/checkSegment.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseFolderReference,
  parseItemRef,
  requireUser,
} from "./request.js";

/**
 * `GET /api/folders-tree/check-segment?parent=root|<id>&segment=...&locale=...&exclude[collection]=pages&exclude[id]=41`
 * answers `{ ok, message? }`. `exclude` is the item being edited; `exclude=pages:41` works too.
 */
export const buildCheckSegmentEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};

    if (typeof query.segment !== "string" || query.segment === "") {
      throw badRequest("`segment` is required");
    }
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
      await checkSegment(req, {
        exclude:
          exclude === undefined ? undefined : parseItemRef(payload, options, exclude, "exclude"),
        locale: query.locale,
        parent,
        segment: query.segment,
      })
    );
  },
  method: "get",
  path: "/folders-tree/check-segment",
});
