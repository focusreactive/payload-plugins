import type { PayloadHandler } from "payload";
import { RELEASES_SLUG } from "../constants";
import { orchestrateRollback } from "../rollback/orchestrateRollback";

interface RollbackReleaseConfig {
  hooks?: {
    afterRollback?: (args: {
      releaseId: string;
      req: any;
    }) => void | Promise<void>;
    onRollbackError?: (args: {
      releaseId: string;
      errors: Array<{ collection: string; docId: string; error: string }>;
      req: any;
    }) => void | Promise<void>;
  };
}

export function createRollbackReleaseHandler(
  config: RollbackReleaseConfig,
): PayloadHandler {
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
          {
            error: `Cannot rollback a release with status "${currentStatus}"`,
          },
          { status: 400 },
        );
      }

      const result = await orchestrateRollback({
        releaseId,
        payload: req.payload,
        req,
        hooks: config.hooks,
      });

      return Response.json({ ok: true, ...result });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
