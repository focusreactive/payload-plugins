import type { PayloadHandler } from "payload";
import { RELEASE_ITEMS_SLUG } from "../constants";
import { detectConflicts } from "../publish/detectConflicts";

export function createCheckConflictsHandler(): PayloadHandler {
  return async (req) => {
    if (!req.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const releaseId = (req.routeParams as any)?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    try {
      const { docs: items } = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG as any,
        where: { release: { equals: releaseId } },
        limit: 10000,
      });

      const conflicts = await detectConflicts(items as any, req.payload);

      return Response.json({ conflicts, total: items.length });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
