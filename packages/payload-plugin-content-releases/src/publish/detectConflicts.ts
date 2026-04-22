import type { Payload } from "payload";

export interface ConflictResult {
  itemId: string;
  collection: string;
  docId: string;
  reason: string;
}

interface ReleaseItemForConflict {
  id: string;
  targetCollection: string;
  targetDoc: string;
  baseVersion: string | null;
  action: string;
}

export async function detectConflicts(
  items: ReleaseItemForConflict[],
  payload: Payload,
): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];

  for (const item of items) {
    if (!item.baseVersion) continue;

    try {
      const doc = await payload.findByID({
        collection: item.targetCollection as any,
        id: item.targetDoc,
      });

      if ((doc as any).updatedAt !== item.baseVersion) {
        conflicts.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
          reason: `Document was modified since staging. Expected version: ${item.baseVersion}, current: ${(doc as any).updatedAt}`,
        });
      }
    } catch {
      conflicts.push({
        itemId: item.id,
        collection: item.targetCollection,
        docId: item.targetDoc,
        reason: `Document not found in "${item.targetCollection}" collection`,
      });
    }
  }

  return conflicts;
}
