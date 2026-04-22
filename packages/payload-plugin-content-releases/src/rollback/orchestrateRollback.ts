import type { Payload } from "payload";
import { RELEASES_SLUG } from "../constants";
import { previewRollback } from "./previewRollback";
import { executeRollback } from "./executeRollback";

interface OrchestrateRollbackOptions {
  releaseId: string;
  payload: Payload;
  req?: any;
  hooks?: {
    afterRollback?: (args: {
      releaseId: string;
      req: any;
    }) => void | Promise<void>;
    onRollbackError?: (args: {
      releaseId: string;
      errors: Array<{ collection: string; docId: string; error: string }>;
      req: any;
    }) => void | Promise<void>;
  };
}

interface OrchestrateRollbackResult {
  status: "reverted" | "failed";
  restored: number;
  failed: number;
  errors?: Array<{ collection: string; docId: string; error: string }>;
}

export async function orchestrateRollback(
  options: OrchestrateRollbackOptions,
): Promise<OrchestrateRollbackResult> {
  const { releaseId, payload, req, hooks } = options;

  const release = await payload.findByID({
    collection: RELEASES_SLUG,
    id: releaseId,
  });

  const currentStatus = release.status;
  if (currentStatus !== "published") {
    throw new Error(`Cannot rollback a release with status ${currentStatus}`);
  }

  const { eligible, skipped } = await previewRollback({
    releaseId,
    payload,
  });

  await payload.update({
    collection: RELEASES_SLUG,
    id: releaseId,
    data: { status: "reverting" },
  });

  const result = await executeRollback({
    eligible,
    payload,
  });

  const finalStatus =
    eligible.length === 0 || result.restored.length > 0 ? "reverted" : "failed";

  const rollbackSkipped = [...skipped, ...result.failed];

  await payload.update({
    collection: RELEASES_SLUG,
    id: releaseId,
    data: {
      status: finalStatus,
      rollbackSkipped,
    },
  });

  if (finalStatus === "failed" && hooks?.onRollbackError) {
    await hooks.onRollbackError({
      releaseId,
      errors: result.failed,
      req,
    });
  } else if (finalStatus === "reverted" && hooks?.afterRollback) {
    await hooks.afterRollback({
      releaseId,
      req,
    });
  }

  return {
    status: finalStatus,
    restored: result.restored.length,
    failed: result.failed.length,
    errors: result.failed.length > 0 ? result.failed : undefined,
  };
}
