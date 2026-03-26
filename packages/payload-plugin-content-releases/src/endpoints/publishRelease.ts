import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import { executePublish } from "../publish/executePublish";

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

      const { docs: items } = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG as any,
        where: { release: { equals: releaseId } },
        limit: 0,
      });

      if (items.length === 0) {
        return Response.json({ error: "Release has no items to publish" }, { status: 400 });
      }

      // Set status to publishing
      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: releaseId,
        data: { status: "publishing" } as any,
      });

      const result = await executePublish({
        items: items as any,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      // Update item statuses
      for (const p of result.published) {
        await req.payload.update({
          collection: RELEASE_ITEMS_SLUG as any,
          id: p.itemId,
          data: { status: "published" } as any,
        });
      }
      for (const f of result.failed) {
        await req.payload.update({
          collection: RELEASE_ITEMS_SLUG as any,
          id: f.itemId,
          data: { status: "failed" } as any,
        });
      }

      const hasFailures = result.failed.length > 0;
      const finalStatus = hasFailures ? "failed" : "published";

      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: releaseId,
        data: {
          status: finalStatus,
          ...(hasFailures
            ? { errorLog: result.failed }
            : { publishedAt: new Date().toISOString() }),
          rollbackSnapshot: result.rollbackSnapshot,
        } as any,
      });

      if (hasFailures && config.hooks?.onPublishError) {
        await config.hooks.onPublishError({ releaseId, errors: result.failed, req });
      } else if (!hasFailures && config.hooks?.afterPublish) {
        await config.hooks.afterPublish({ releaseId, req });
      }

      return Response.json({
        ok: true,
        status: finalStatus,
        published: result.published.length,
        failed: result.failed.length,
        errors: hasFailures ? result.failed : undefined,
      });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
