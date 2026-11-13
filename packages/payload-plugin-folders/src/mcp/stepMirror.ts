import type { PayloadRequest } from "payload";

import { readOperationProgress, stepOperation } from "../core/operations.js";
import type { OperationProgress } from "../core/operations.js";
import type { FolderId, ResolvedOptions } from "../types.js";

/** How long a tool steps a queued batch itself before it hands back what is left. */
export const mirrorStepBudgetMs = 20_000;

let currentBudgetMs = mirrorStepBudgetMs;

/** Shortens or removes the wait so a test can prove the report of a batch left running; returns the old one. */
export const setMirrorStepBudgetMs = (budgetMs: number): number => {
  const previous = currentBudgetMs;
  currentBudgetMs = budgetMs;

  return previous;
};

/**
 * Steps a queued operation the way the admin does, one slice per call, until it is done, a step
 * fails or the time is up. An MCP caller has no admin open to do it. A failed step is reported, not
 * retried: the operation keeps its id, so the admin or another call can step it again.
 */
export const stepQueuedOperation = async ({
  operationId,
  options,
  req,
}: {
  operationId: FolderId;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<OperationProgress> => {
  const deadline = Date.now() + currentBudgetMs;
  let progress = await readOperationProgress(req, operationId);
  while (progress.status === "running" && Date.now() < deadline) {
    progress = await stepOperation(req, operationId, { options });
  }

  return progress;
};
