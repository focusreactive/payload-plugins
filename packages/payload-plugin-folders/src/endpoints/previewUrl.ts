import { APIError } from "payload";
import type { Endpoint } from "payload";

import type { ResolvedOptions } from "../types.js";
import { badRequest, isRecord, requireUser } from "./request.js";

/**
 * `GET /api/folders-tree/preview-url?collection=pages&fullPath=/company/contact&locale=en` answers
 * `{ url }` with the host's `admin.previewUrl` builder applied. The builder is a function, so it
 * cannot reach the browser; the menu asks for each link. 404 when the host set no builder.
 */
export const buildPreviewUrlEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const buildUrl = options.admin.previewUrl;
    if (!buildUrl) {
      throw new APIError("No admin.previewUrl is configured", 404, null, true);
    }
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const { collection, fullPath, locale } = query;
    if (typeof collection !== "string" || !options.collections[collection]) {
      throw badRequest("`collection` must be a page collection of the tree");
    }
    if (typeof fullPath !== "string" || !fullPath.startsWith("/")) {
      throw badRequest("`fullPath` must be a path that starts with a slash");
    }
    if (locale !== undefined && typeof locale !== "string") {
      throw badRequest("`locale` must be a string");
    }

    return Response.json({ url: buildUrl({ collection, fullPath, locale: locale ?? null }) });
  },
  method: "get",
  path: "/folders-tree/preview-url",
});
