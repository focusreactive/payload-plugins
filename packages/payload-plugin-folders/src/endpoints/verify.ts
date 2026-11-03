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
 * tree view's drift banner. It adds `canRepair`, whether the user passes `canRepairTree`, so the
 * admin knows whether to show the Rebuild action. A user without that right gets the counts
 * (`ok`, `fixable`, `conflicts`, `counts`) and no `issues`: the list names folder ids and paths,
 * and the banner needs only the numbers. The full pass lists pages, segments and ids that include
 * drafts, so it needs repair rights (`canRepairTree`), the same as `POST /repair`; others get 403.
 */
export const buildVerifyEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    const query: Record<string, unknown> = isRecord(req.query) ? req.query : {};
    const quick = parseBoolean(query.quick, "quick") ?? false;
    if (!(quick || (await canRepairTree({ options, req })))) {
      throw new Forbidden(req.t);
    }

    const result = await verifyTree(req.payload, { quick, req });

    // The quick answer is what the tree view reads on load, and it is the one place the admin can
    // ask whether to offer "Rebuild full URLs": `access.repair` is a function of the host's, so the
    // browser cannot evaluate it. The full pass already needs the right, so it adds nothing.
    if (!quick) {
      return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
    }
    const canRepair = await canRepairTree({ options, req });
    const { issues: _issues, ...withoutIssues } = result;

    return Response.json(canRepair ? { ...result, canRepair } : { ...withoutIssues, canRepair }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  },
  method: "get",
  path: "/folders-tree/verify",
});
