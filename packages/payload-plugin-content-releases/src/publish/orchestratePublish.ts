import type { Payload } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import { executePublish, type PublishResult } from "./executePublish";

interface OrchestratePublishOptions {
  releaseId: string;
  payload: Payload;
  conflictStrategy: ConflictStrategy;
  batchSize: number;
}

interface OrchestratePublishResult {
  status: "published" | "failed";
  published: number;
  failed: number;
  errors?: PublishResult["failed"];
}

export async function orchestratePublish(
  options: OrchestratePublishOptions,
): Promise<OrchestratePublishResult> {
  const { releaseId, payload, conflictStrategy, batchSize } = options;

  const { docs: items } = await payload.find({
    collection: RELEASE_ITEMS_SLUG as any,
    where: { release: { equals: releaseId } },
    limit: 10000,
  });

  if (items.length === 0) {
    await payload.update({
      collection: RELEASES_SLUG as any,
      id: releaseId,
      data: { status: "publishing" } as any,
    });
    await payload.update({
      collection: RELEASES_SLUG as any,
      id: releaseId,
      data: { status: "failed", errorLog: [{ error: "No items in release" }] } as any,
    });
    return { status: "failed", published: 0, failed: 0, errors: [] };
  }

  // Set status to publishing
  await payload.update({
    collection: RELEASES_SLUG as any,
    id: releaseId,
    data: { status: "publishing" } as any,
  });

  const result = await executePublish({
    items: items as any,
    payload,
    conflictStrategy,
    batchSize,
  });

  // Update item statuses
  for (const p of result.published) {
    await payload.update({
      collection: RELEASE_ITEMS_SLUG as any,
      id: p.itemId,
      data: { status: "published" } as any,
    });
  }
  for (const f of result.failed) {
    await payload.update({
      collection: RELEASE_ITEMS_SLUG as any,
      id: f.itemId,
      data: { status: "failed" } as any,
    });
  }

  const hasFailures = result.failed.length > 0;
  const finalStatus = hasFailures ? "failed" : "published";

  await payload.update({
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

  return {
    status: finalStatus,
    published: result.published.length,
    failed: result.failed.length,
    errors: hasFailures ? result.failed : undefined,
  };
}
