import type { Endpoint } from "payload";

import { planFolderEdit } from "../core/folderPreview.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseFolderReference,
  parseId,
  readJsonBody,
  requireUser,
} from "./request.js";

/**
 * `POST /api/folders-tree/folders/:id/preview` with `{ slug?, parent?, locale? }`: a `MovePreview`
 * of saving that edit of the folder, for the dialog that confirms a rename. Writes nothing.
 */
export const buildFolderPreviewEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const folder = parseId(payload, options.folders.slug, req.routeParams?.id, "The folder id");
    const body = await readJsonBody(req);
    if (!isRecord(body)) {
      throw badRequest("Send a JSON object with `slug`, `parent` or `locale`");
    }
    if (body.slug !== undefined && typeof body.slug !== "string") {
      throw badRequest("`slug` must be a string");
    }
    if (body.locale !== undefined && typeof body.locale !== "string") {
      throw badRequest("`locale` must be a string");
    }
    const parent =
      body.parent === undefined
        ? undefined
        : parseFolderReference(payload, options, body.parent, "parent");

    return Response.json(
      await planFolderEdit(
        req,
        { folder, locale: body.locale, parent, slug: body.slug },
        { overrideAccess: false }
      )
    );
  },
  method: "post",
  path: "/folders-tree/folders/:id/preview",
});
