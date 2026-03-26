import type { PayloadHandler } from "payload";
import { RELEASE_ITEMS_SLUG } from "../constants";
import { detectConflicts } from "../publish/detectConflicts";

export function createCheckConflictsHandler(): PayloadHandler {
  return async (req) => {
    const releaseId = (req.routeParams as any)?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    const { docs: items } = await req.payload.find({
      collection: RELEASE_ITEMS_SLUG as any,
      where: { release: { equals: releaseId } },
      limit: 0,
    });

    const conflicts = await detectConflicts(items as any, req.payload);

    return Response.json({ conflicts, total: items.length });
  };
}
