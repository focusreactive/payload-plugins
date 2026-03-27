import type { Payload } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, PLUGIN_NAME } from "../constants";
import { orchestratePublish } from "../publish/orchestratePublish";

interface CheckScheduledReleasesOptions {
  payload: Payload;
  conflictStrategy: ConflictStrategy;
  batchSize: number;
}

export async function checkScheduledReleases(
  options: CheckScheduledReleasesOptions,
): Promise<void> {
  const { payload, conflictStrategy, batchSize } = options;

  const now = new Date().toISOString();

  const { docs: dueReleases } = await payload.find({
    collection: RELEASES_SLUG as any,
    where: {
      and: [
        { status: { equals: "scheduled" } },
        { scheduledAt: { less_than_equal: now } },
      ],
    },
    limit: 100,
  });

  if (dueReleases.length === 0) return;

  for (const release of dueReleases) {
    const releaseId = String((release as any).id);
    const releaseName = (release as any).name ?? releaseId;

    try {
      const result = await orchestratePublish({
        releaseId,
        payload,
        conflictStrategy,
        batchSize,
      });

      payload.logger.info(
        `[${PLUGIN_NAME}] Release "${releaseName}" ${result.status}: ${result.published} published, ${result.failed} failed`,
      );
    } catch (err) {
      payload.logger.error(
        `[${PLUGIN_NAME}] Failed to process release "${releaseName}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
