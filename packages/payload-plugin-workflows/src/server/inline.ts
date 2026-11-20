import type { Payload } from "payload";
import { createLocalReq } from "payload";

import { INLINE_JOB_LIMIT, JOBS_QUEUE, QUEUED_JOBS } from "../lib/constants.js";
import type { JobId } from "./commit.js";

/**
 * Runs just-committed effect jobs right away, so effects work with no queue setup. Effects that
 * queue further effects (an effect's `{ set }` moving the run) are picked up too, up to a limit.
 * Failures are logged; a failed job keeps its retries and stays queued for the host's runner.
 *
 * Returns whether anything ran, so the caller knows to reload the run before answering.
 */
export const runJobsInline = async (payload: Payload, jobs: JobId[]): Promise<boolean> => {
  if (jobs.length === 0) {
    return false;
  }
  const queued: JobId[] = [];
  const pending = [...jobs];
  let ran = 0;
  while (pending.length > 0 && ran < INLINE_JOB_LIMIT) {
    const id = pending.shift() as JobId;
    ran += 1;
    // A fresh request (and context) per job: what one handler sets on `req.context`, such as the
    // guard bypass, must not reach the next one.
    const req = await createLocalReq({ context: { [QUEUED_JOBS]: queued } }, payload);
    try {
      // Not `jobs.runByID`: with `jobs.runHooks: true` (set by other plugins, e.g. scheduling)
      // Payload 3.90 claims the job but never runs it. `run` with a `where` on the id does both.
      await payload.jobs.run({ queue: JOBS_QUEUE, where: { id: { equals: id } }, limit: 1, req });
    } catch (error) {
      payload.logger.error({ err: error, msg: `workflows: effect job ${id} failed to run inline` });
    }
    pending.push(...queued.splice(0));
  }
  if (pending.length > 0) {
    payload.logger.warn(
      `workflows: ${pending.length} effect job(s) left queued after ${INLINE_JOB_LIMIT} inline runs`
    );
  }
  return true;
};
