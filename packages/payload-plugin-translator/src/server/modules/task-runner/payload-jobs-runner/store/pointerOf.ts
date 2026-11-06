import { WorkflowInputSchema } from "./jobInput.schema.js";
import type { PayloadJob, StoredWorkflowInput } from "./types.js";

/**
 * The pointer a job row carries, or nothing — which is how a row queued before 1.0 announces itself.
 */
export function pointerOf(job: PayloadJob): StoredWorkflowInput | null {
  const parsed = WorkflowInputSchema.safeParse(job.input);
  return parsed.success ? parsed.data : null;
}
