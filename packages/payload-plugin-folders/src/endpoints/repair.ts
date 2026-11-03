import { Forbidden } from "payload";
import type { Endpoint } from "payload";

import { canRepairTree } from "../core/access.js";
import { repairTree } from "../core/repair.js";
import type { ResolvedOptions } from "../types.js";
import { badRequest, isRecord, readJsonBody, requireUser } from "./request.js";

/**
 * `POST /api/folders-tree/repair` (spec section 5.9) with `{ dryRun?, redirects? }` answers the
 * `RepairResult`: what was fixed (or, with `dryRun: true`, what would be), the conflicts left for a
 * person, the URL changes and the rows written. Send a JSON object: `{}` repairs. Only a user who passes
 * `canRepairTree` may call it: `access.repair` when the host set it (403 otherwise).
 */
export const buildRepairEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    requireUser(req);
    if (!(await canRepairTree({ options, req }))) {
      throw new Forbidden(req.t);
    }

    const body = await readJsonBody(req);
    if (!isRecord(body)) {
      throw badRequest("Send a JSON object, such as { dryRun: true }");
    }
    for (const name of ["dryRun", "redirects"]) {
      if (body[name] !== undefined && typeof body[name] !== "boolean") {
        throw badRequest(`\`${name}\` must be true or false`);
      }
    }

    return Response.json(
      await repairTree(req.payload, {
        dryRun: body.dryRun as boolean | undefined,
        redirects: body.redirects as boolean | undefined,
        req,
      }),
      { headers: { "Cache-Control": "private, no-store" } }
    );
  },
  method: "post",
  path: "/folders-tree/repair",
});
