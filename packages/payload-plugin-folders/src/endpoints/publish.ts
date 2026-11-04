import type { Endpoint } from "payload";

import { applyPublish, previewPublish } from "../core/publish.js";
import type { PublishAction } from "../core/publish.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseItemRef,
  parseLocale,
  readJsonBody,
  requireUser,
} from "./request.js";

/**
 * `POST /api/folders-tree/publish` with `{ items, action: 'publish' | 'unpublish', locale?, dryRun? }`
 * (spec section 10.2). Folders expand to every page beneath them. Answers `{ updated, skipped }`, or
 * `{ operationId, total, skipped }` above `limits.maxSyncDocuments` pages, which the admin steps.
 * `dryRun` answers the counts a dialog states (`{ folders, pages, skipped, isBatched }`) and writes
 * nothing. Access is always checked, as the signed-in user: a page the user may not publish refuses
 * the whole request with a 403 that names no title.
 */
export const buildPublishEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const body = await readJsonBody(req);
    if (!isRecord(body)) {
      throw badRequest("Send a JSON object with `items` and `action`");
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw badRequest("Choose at least one item");
    }
    if (body.items.length > options.limits.maxItemsPerMove) {
      throw badRequest(`Choose at most ${options.limits.maxItemsPerMove} items at once`);
    }
    if (body.action !== "publish" && body.action !== "unpublish") {
      throw badRequest("`action` must be publish or unpublish");
    }
    if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") {
      throw badRequest("`dryRun` must be true or false");
    }
    const request = {
      action: body.action as PublishAction,
      items: body.items.map((item, index) =>
        parseItemRef(payload, options, item, `items[${index}]`)
      ),
      locale: parseLocale(payload, body.locale),
    };

    if (body.dryRun === true) {
      return Response.json(await previewPublish(req, request, { options, overrideAccess: false }));
    }

    return Response.json(await applyPublish(req, request, { options, overrideAccess: false }));
  },
  method: "post",
  path: "/folders-tree/publish",
});
