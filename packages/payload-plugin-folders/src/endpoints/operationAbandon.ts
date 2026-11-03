import type { Endpoint } from "payload";

import { abandonOperation } from "../core/operations.js";
import { folderOperationsSlug } from "../constants.js";
import { parseId, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/operations/:id/abandon`: gives up on a batched operation that failed, and
 * answers how far it got as `{ done, total, status: 'abandoned' }`. Only the user who started the
 * operation may abandon it (403 otherwise, 404 when there is none). Later steps change nothing.
 */
export const buildOperationAbandonEndpoint = (): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const id = parseId(req.payload, folderOperationsSlug, req.routeParams?.id, "The operation id");

    return Response.json(await abandonOperation(req, id));
  },
  method: "post",
  path: "/folders-tree/operations/:id/abandon",
});
