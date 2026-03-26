import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG } from "../constants";
import { orchestratePublish } from "../publish/orchestratePublish";

interface PublishReleaseConfig {
  conflictStrategy: ConflictStrategy;
  publishBatchSize: number;
  hooks?: {
    afterPublish?: (args: { releaseId: string; req: any }) => void | Promise<void>;
    onPublishError?: (args: { releaseId: string; errors: any[]; req: any }) => void | Promise<void>;
  };
}

export function createPublishReleaseHandler(config: PublishReleaseConfig): PayloadHandler {
  return async (req) => {
    if (!req.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const releaseId = (req.routeParams as any)?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    try {
      const release = await req.payload.findByID({
        collection: RELEASES_SLUG as any,
        id: releaseId,
      });

      if ((release as any).status !== "draft") {
        return Response.json(
          { error: `Release can only be published from "draft" status. Current: "${(release as any).status}"` },
          { status: 400 },
        );
      }

      const result = await orchestratePublish({
        releaseId,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      if (result.status === "failed" && config.hooks?.onPublishError) {
        await config.hooks.onPublishError({ releaseId, errors: result.errors ?? [], req });
      } else if (result.status === "published" && config.hooks?.afterPublish) {
        await config.hooks.afterPublish({ releaseId, req });
      }

      return Response.json({ ok: true, ...result });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
