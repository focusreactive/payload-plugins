import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import { executePublish } from "../publish/executePublish";

interface RunScheduledConfig {
  secret: string;
  conflictStrategy: ConflictStrategy;
  publishBatchSize: number;
}

export function createRunScheduledHandler(config: RunScheduledConfig): PayloadHandler {
  return async (req) => {
    const auth = req.headers.get("authorization");
    if (!config.secret || auth !== `Bearer ${config.secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { docs: dueReleases } = await req.payload.find({
      collection: RELEASES_SLUG as any,
      where: {
        and: [
          { status: { equals: "scheduled" } },
          { scheduledAt: { less_than_equal: now } },
        ],
      },
      limit: 0,
    });

    const results: Array<{ releaseId: string; status: string; published: number; failed: number }> = [];

    for (const release of dueReleases) {
      const { docs: items } = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG as any,
        where: { release: { equals: (release as any).id } },
        limit: 0,
      });

      if (items.length === 0) {
        await req.payload.update({
          collection: RELEASES_SLUG as any,
          id: (release as any).id,
          data: { status: "failed", errorLog: [{ error: "No items in release" }] } as any,
        });
        results.push({ releaseId: (release as any).id, status: "failed", published: 0, failed: 0 });
        continue;
      }

      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: (release as any).id,
        data: { status: "publishing" } as any,
      });

      const result = await executePublish({
        items: items as any,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      const hasFailures = result.failed.length > 0;
      const finalStatus = hasFailures ? "failed" : "published";

      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: (release as any).id,
        data: {
          status: finalStatus,
          ...(hasFailures ? { errorLog: result.failed } : { publishedAt: new Date().toISOString() }),
          rollbackSnapshot: result.rollbackSnapshot,
        } as any,
      });

      results.push({
        releaseId: (release as any).id,
        status: finalStatus,
        published: result.published.length,
        failed: result.failed.length,
      });
    }

    return Response.json({ ok: true, processed: results.length, results });
  };
}
