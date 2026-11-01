import { Forbidden } from "payload";
import type { Endpoint } from "payload";

import { canRepairTree } from "../core/access.js";
import { verifyTree } from "../core/verify.js";
import type { ResolvedOptions } from "../types.js";
import { isRecord, parseBoolean, requireUser } from "./request.js";

/**
 * `GET /api/folders-tree/verify` (spec section 5.9) answers the `VerifyResult`: `{ ok, quick,
 * counts, issues, fixable, conflicts, truncated }`.
 *
 * `?quick=1` reads the folder rows only (one query) and is for any signed-in user, which is the
 * tree view's drift banner: folders are public and the answer names nothing else. The full pass
 * lists pages, segments and ids that include drafts, so it needs repair rights (`canRepairTree`),
 * the same as `POST /repair`; others get 403.
 */
export const buildVerifyEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const quick = parseBoolean(query.quick, "quick") ?? false;
    if (!(quick || (await canRepairTree({ options, req })))) {
      throw new Forbidden(req.t);
    }

    return Response.json(await verifyTree(req.payload, { quick, req }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  },
  method: "get",
  path: "/folders-tree/verify",
});
