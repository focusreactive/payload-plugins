import type { Payload } from "payload";
import type { RollbackEntry } from "./previewRollback";

interface ExecuteRollbackOptions {
  eligible: RollbackEntry[];
  payload: Payload;
}

interface RollbackResult {
  restored: Array<{
    collection: string;
    docId: string;
    newUpdatedAt: string | null;
  }>;
  failed: Array<{
    collection: string;
    docId: string;
    error: string;
  }>;
}

export async function executeRollback(
  options: ExecuteRollbackOptions,
): Promise<RollbackResult> {
  const { eligible, payload } = options;
  const restored: RollbackResult["restored"] = [];
  const failed: Array<{ collection: string; docId: string; error: string }> =
    [];

  for (const entry of eligible) {
    if (entry.previousState === null) {
      failed.push({
        collection: entry.collection,
        docId: entry.docId,
        error: "No previous state to restore",
      });
      continue;
    }

    const { id, createdAt, updatedAt, ...strippedState } = entry.previousState;

    try {
      const updatedDoc = (await payload.update({
        collection: entry.collection,
        id: entry.docId,
        data: strippedState,
      })) as { updatedAt?: string };

      restored.push({
        collection: entry.collection,
        docId: entry.docId,
        newUpdatedAt: updatedDoc?.updatedAt ?? null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      failed.push({
        collection: entry.collection,
        docId: entry.docId,
        error: errorMessage,
      });
    }
  }

  return { restored, failed };
}
