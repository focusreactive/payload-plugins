import type { Endpoint } from "payload";

import { stepOperation } from "../core/operations.js";
import type { ResolvedOptions } from "../types.js";
import { parseId, requireUser } from "./request.js";
import { folderOperationsSlug } from "../constants.js";

/**
 * `POST /api/folders-tree/operations/:id/step` (spec section 10.2): processes the next slice of a
 * batched operation and answers `{ done, total, status, error? }`. Only the user who started the
 * operation may step it. A failed step answers 200 with `status: 'failed'` and the error, and the
 * next call retries the same slice.
 */
export const buildOperationStepEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const id = parseId(req.payload, folderOperationsSlug, req.routeParams?.id, "The operation id");

    return Response.json(await stepOperation(req, id, { options }));
  },
  method: "post",
  path: "/folders-tree/operations/:id/step",
});
