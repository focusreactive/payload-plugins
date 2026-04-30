import type { PayloadHandler } from "payload";
import { RELEASES_SLUG } from "../constants";
import { previewRollback } from "../rollback/previewRollback";

export function createPreviewRollbackHandler(): PayloadHandler {
  return async (req) => {
    if (!req.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const releaseId = req.routeParams?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    try {
      const release = await req.payload.findByID({
        collection: RELEASES_SLUG,
        id: releaseId,
      });

      const currentStatus = release?.status as string;
      if (currentStatus !== "published") {
        return Response.json(
          { error: "Release is not published" },
          { status: 400 },
        );
      }

      const result = await previewRollback({
        releaseId,
        payload: req.payload,
      });

      return Response.json(result);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
