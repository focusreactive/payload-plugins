import type { Payload } from "payload";
import { RELEASES_SLUG } from "../constants";

export interface RollbackEntry {
  collection: string;
  docId: string;
  action: string;
  previousState: Record<string, any> | null;
}

interface PreviewRollbackOptions {
  releaseId: string;
  payload: Payload;
}

export interface PreviewRollbackResult {
  eligible: RollbackEntry[];
  skipped: RollbackEntry[];
}

export async function previewRollback(
  options: PreviewRollbackOptions,
): Promise<PreviewRollbackResult> {
  const { releaseId, payload } = options;

  const release = await payload.findByID({
    collection: RELEASES_SLUG,
    id: releaseId,
  });

  const rollbackSnapshot = release?.rollbackSnapshot as RollbackEntry[] | null;
  const publishedAt = release?.publishedAt as string | null;

  if (!rollbackSnapshot || rollbackSnapshot.length === 0) {
    return { eligible: [], skipped: [] };
  }

  const eligible: RollbackEntry[] = [];
  const skipped: RollbackEntry[] = [];

  for (const entry of rollbackSnapshot) {
    const versionsResult = await payload.findVersions({
      collection: entry.collection,
      where: {
        parent: { equals: entry.docId },
        "version._status": { equals: "published" },
      },
      sort: "-updatedAt",
      limit: 1,
    });

    const latestPublished = versionsResult.docs?.[0];

    if (
      latestPublished &&
      latestPublished.updatedAt &&
      publishedAt &&
      new Date(latestPublished.updatedAt) > new Date(publishedAt)
    ) {
      skipped.push(entry);
    } else {
      eligible.push(entry);
    }
  }

  return { eligible, skipped };
}
