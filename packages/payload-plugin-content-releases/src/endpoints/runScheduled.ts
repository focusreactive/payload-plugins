import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG } from "../constants";
import { orchestratePublish } from "../publish/orchestratePublish";

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
      limit: 10000,
    });

    const results: Array<{ releaseId: string; status: string; published: number; failed: number }> = [];

    for (const release of dueReleases) {
      const result = await orchestratePublish({
        releaseId: (release as any).id,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      results.push({
        releaseId: (release as any).id,
        ...result,
      });
    }

    return Response.json({ ok: true, processed: results.length, results });
  };
}
