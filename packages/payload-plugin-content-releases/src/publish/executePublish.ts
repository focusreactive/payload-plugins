import type { Payload } from "payload";
import type { ConflictStrategy } from "../types";

interface ReleaseItemForPublish {
  id: string;
  targetCollection: string;
  targetDoc: string;
  action: string;
  snapshot: Record<string, any>;
  baseVersion: string | null;
}

interface RollbackEntry {
  collection: string;
  docId: string;
  action: string;
  previousState: Record<string, any> | null;
}

export interface PublishResult {
  published: Array<{ itemId: string; collection: string; docId: string }>;
  failed: Array<{ itemId: string; collection: string; docId: string; error: string }>;
  rollbackSnapshot: RollbackEntry[];
}

interface ExecutePublishOptions {
  items: ReleaseItemForPublish[];
  payload: Payload;
  conflictStrategy: ConflictStrategy;
  batchSize: number;
}

export async function executePublish(options: ExecutePublishOptions): Promise<PublishResult> {
  const { items, payload, conflictStrategy, batchSize } = options;
  const published: PublishResult["published"] = [];
  const failed: PublishResult["failed"] = [];
  const rollbackSnapshot: RollbackEntry[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    for (const item of batch) {
      try {
        const currentDoc = await payload.findByID({
          collection: item.targetCollection as any,
          id: item.targetDoc,
        });

        if (item.baseVersion && (currentDoc as any).updatedAt !== item.baseVersion) {
          if (conflictStrategy === "fail") {
            failed.push({
              itemId: item.id,
              collection: item.targetCollection,
              docId: item.targetDoc,
              error: `Conflict: document modified since staging (expected ${item.baseVersion}, got ${(currentDoc as any).updatedAt})`,
            });
            continue;
          }
        }

        rollbackSnapshot.push({
          collection: item.targetCollection,
          docId: item.targetDoc,
          action: item.action,
          previousState: currentDoc as Record<string, any>,
        });

        if (item.action === "unpublish") {
          await payload.update({
            collection: item.targetCollection as any,
            id: item.targetDoc,
            data: { _status: "draft" } as any,
          });
        } else {
          await payload.update({
            collection: item.targetCollection as any,
            id: item.targetDoc,
            data: { ...item.snapshot, _status: "published" } as any,
          });
        }

        published.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
        });
      } catch (err) {
        failed.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { published, failed, rollbackSnapshot };
}
