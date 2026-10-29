import type { Endpoint } from "payload";

import { planMove } from "../core/move.js";
import type { ResolvedOptions } from "../types.js";
import { parseMoveRequest, readJsonBody, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/move/preview`: what `POST /move` would do, as a `MovePreview`, without
 * the tree lock and without writing. A move that cannot happen is a 200 with `ok: false` and the
 * reasons in `blocked`, which is what the confirm dialog shows; only a malformed request is an error.
 */
export const buildMovePreviewEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const request = parseMoveRequest(req.payload, options, await readJsonBody(req));

    return Response.json(await planMove(req, request, { overrideAccess: false }));
  },
  method: "post",
  path: "/folders-tree/move/preview",
});
