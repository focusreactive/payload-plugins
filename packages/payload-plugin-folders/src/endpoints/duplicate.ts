import type { Endpoint } from "payload";

import { applyDuplicate } from "../core/duplicate.js";
import type { DuplicateRequest } from "../core/duplicate.js";
import type { ResolvedOptions } from "../types.js";
import {
  badRequest,
  isRecord,
  parseFolderReference,
  parseItemRef,
  readJsonBody,
  requireUser,
} from "./request.js";

/**
 * `POST /api/folders-tree/duplicate` with `{ items, toFolder?, overrides?: { name?, slug? } }`
 * (spec section 10.2). `toFolder` is a folder id, or `null` for the top level; a single item without
 * it is copied beside the original, and several items need a folder other than their own. Answers
 * `{ created }` (the copies of the selected items), or `{ operationId, total }` above
 * `limits.maxSyncDocuments` documents, which the admin steps. Access is always checked, as the
 * signed-in user: read access to everything copied and create access where the copies go.
 */
export const buildDuplicateEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const { payload } = req;
    const body = await readJsonBody(req);
    if (!isRecord(body)) {
      throw badRequest("Send a JSON object with `items`");
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw badRequest("Choose at least one item to copy");
    }
    if (body.items.length > options.limits.maxItemsPerOperation) {
      throw badRequest(`Copy at most ${options.limits.maxItemsPerOperation} items at once`);
    }

    const request: DuplicateRequest = {
      items: body.items.map((item, index) =>
        parseItemRef(payload, options, item, `items[${index}]`)
      ),
    };
    if ("toFolder" in body && body.toFolder !== undefined) {
      request.toFolder = parseFolderReference(payload, options, body.toFolder, "toFolder");
    }
    if (body.overrides !== undefined) {
      if (!isRecord(body.overrides)) {
        throw badRequest("`overrides` must be { name?, slug? }");
      }
      const { name, slug } = body.overrides;
      if (
        (name !== undefined && (typeof name !== "string" || name.trim() === "")) ||
        (slug !== undefined && typeof slug !== "string")
      ) {
        throw badRequest("`overrides.name` and `overrides.slug` must be text");
      }
      request.overrides = {
        ...(name === undefined ? {} : { name: name as string }),
        ...(slug === undefined ? {} : { slug: slug as string }),
      };
    }

    return Response.json(await applyDuplicate(req, request, { options, overrideAccess: false }));
  },
  method: "post",
  path: "/folders-tree/duplicate",
});
