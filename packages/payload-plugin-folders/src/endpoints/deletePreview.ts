import type { Endpoint } from "payload";

import { previewDelete } from "../core/deleteItems.js";
import type { ResolvedOptions } from "../types.js";
import { badRequest, isRecord, parseItemRef, readJsonBody, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/delete/preview` with `{ items }` (spec section 10.2): what a delete would
 * remove, as `{ folders, pages, publishedUrls, sample, confirmWord, trash }`. `confirmWord` is the
 * word the dialog asks for above 10 pages (the folder's segment, or `delete` for a mixed
 * selection), and `trash` says the delete is soft. Writes nothing; `sample` lists only what the user
 * may read.
 */
export const buildDeletePreviewEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const body = await readJsonBody(req);
    if (!isRecord(body) || !Array.isArray(body.items) || body.items.length === 0) {
      throw badRequest("Choose at least one item to delete");
    }
    if (body.items.length > options.limits.maxItemsPerMove) {
      throw badRequest(`Delete at most ${options.limits.maxItemsPerMove} items at once`);
    }
    const items = body.items.map((item, index) =>
      parseItemRef(req.payload, options, item, `items[${index}]`)
    );

    return Response.json(await previewDelete(req, { items }, { options, overrideAccess: false }));
  },
  method: "post",
  path: "/folders-tree/delete/preview",
});
