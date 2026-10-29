import type { Endpoint } from "payload";

import { applyMove } from "../core/applyMove.js";
import type { ResolvedOptions } from "../types.js";
import { parseMoveRequest, readJsonBody, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/move` (spec section 10.2): moves or reorders items and answers the
 * `MoveResult`. Access is always checked, as the signed-in user. A refused move is a 400 (the
 * request is malformed), 403 (access), or 409 (stale tree, a path or root-page conflict) whose
 * `errors[0].data` names the `item` and the `reason`.
 */
export const buildMoveEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const request = parseMoveRequest(req.payload, options, await readJsonBody(req));
    const result = await applyMove(req, request, { options, overrideAccess: false });

    return Response.json(result);
  },
  method: "post",
  path: "/folders-tree/move",
});
