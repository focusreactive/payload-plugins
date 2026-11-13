import type { Endpoint } from "payload";

import { readRevision } from "../core/treeLock.js";
import { requireUser } from "./request.js";

/** `GET /api/folders-tree/revision`: the number the admin polls to learn that the tree changed. */
export const buildRevisionEndpoint = (): Endpoint => ({
  handler: async (req) => {
    requireUser(req);

    return Response.json({ revision: await readRevision(req) });
  },
  method: "get",
  path: "/folders-tree/revision",
});
