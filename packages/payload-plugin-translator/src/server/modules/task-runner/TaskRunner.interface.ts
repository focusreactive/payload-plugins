import type { EnqueueAssignment, RunResult } from "./types.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import type { AuthorisedHandle, AuthorisedWork } from "../../shared/access/authorised.js";

/**
 * Interface for task execution backends.
 *
 *
 * **Obligations every implementation holds, whatever it queues onto.** `assertTaskRunnerContract`,
 * published from `@focus-reactive/payload-plugin-translator/testing`, asserts them; a new runner
 * calls that suite once, and the suite's `describe` names are the list.
 *
 * Two it cannot assert, because they bind the caller rather than the runner:
 * - **A handle is never parsed.** Callers compare it, store it and hand it back.
 * - **Nothing promises an order.** Callers that need one sort.
 *
 * Two limits. The obligations reach handles **this runner issued**, and only while the work they
 * name exists: SQLite reuses a deleted row's id, so a handle kept across a cancellation can later
 * name another run — drop a handle once you are told the work settled.
 *
 * And a store may reject a value it could never have produced: on SQL the job id is an integer, so
 * a non-numeric handle fails inside the query rather than finding nothing. `DELETE /translate/cancel`
 * passes such a value straight through and answers with a server error.
 * @since 1.0.0 — the port narrowed; see docs/DEPRECATIONS.md#the-runner-only-accepts-work.
 */
export interface TaskRunner {
  /**
   * Queues the work and answers one assignment per requested locale.
   *
   * `scope` joins the reads and writes this makes to the caller's transaction; omit it outside one —
   * an HTTP route — and each operation opens its own.
   *
   * The plugin has already decided that each document named here is free to take new work, so a
   * runner never looks for a run of its own to merge into.
   *
   * @since 0.16.0 the return type widened.
   */
  enqueue(tasks: AuthorisedWork[], scope?: RequestScope): Promise<EnqueueAssignment[]>;

  /**
   * Stop the work these handles stand for, as far as this runner can.
   *
   * Best effort: a runner that translates inline inside `enqueue` has nothing left to stop, and says
   * so by declaring `stop: false` rather than by implementing a no-op.
   * Report `cancelled` for each locale the run still owed, and for none it had delivered.
   */
  stop?(handles: AuthorisedHandle[]): Promise<void>;

  /**
   * Process a queued job now rather than waiting for a schedule.
   *
   * On a host with no cron this is the only thing that moves the queue.
   */
  run?(handle: AuthorisedHandle): Promise<RunResult>;
}
