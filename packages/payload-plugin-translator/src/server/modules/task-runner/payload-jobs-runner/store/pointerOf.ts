import { WorkflowInputSchema } from "./jobInput.schema.js";
import type { PayloadJob, StoredWorkflowInput } from "./types.js";

/**
 * The pointer a job row carries, or null for a row queued before 1.0 or a damaged one.
 */
export function pointerOf(job: PayloadJob): StoredWorkflowInput | null {
  const parsed = WorkflowInputSchema.safeParse(job.input);
  return parsed.success ? parsed.data : null;
}
