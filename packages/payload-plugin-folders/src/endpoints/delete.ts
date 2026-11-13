import type { Endpoint } from "payload";

import { applyDelete } from "../core/deleteItems.js";
import type { ResolvedOptions } from "../types.js";
import { badRequest, isRecord, parseItemRef, readJsonBody, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/delete` with `{ items, confirmWord? }` (spec section 10.2). Folders are
 * deleted with everything beneath them. Above 10 pages the body has to carry the word the preview
 * asked for (a wrong or missing word is a 400). Answers `{ deleted, trashed }`, or `{ operationId,
 * total }` above `limits.maxSyncDocuments` documents, which the admin steps. Access is always
 * checked, as the signed-in user, for every document that goes: one refusal is a 403 that lists
 * the refused items and removes nothing.
 */
export const buildDeleteEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const body = await readJsonBody(req);
    if (!isRecord(body) || !Array.isArray(body.items) || body.items.length === 0) {
      throw badRequest("Choose at least one item to delete");
    }
    if (body.items.length > options.limits.maxItemsPerOperation) {
      throw badRequest(`Delete at most ${options.limits.maxItemsPerOperation} items at once`);
    }
    if (body.confirmWord !== undefined && typeof body.confirmWord !== "string") {
      throw badRequest("`confirmWord` must be text");
    }
    const items = body.items.map((item, index) =>
      parseItemRef(req.payload, options, item, `items[${index}]`)
    );

    return Response.json(
      await applyDelete(
        req,
        { confirmWord: body.confirmWord as string | undefined, items },
        { options, overrideAccess: false }
      )
    );
  },
  method: "post",
  path: "/folders-tree/delete",
});
