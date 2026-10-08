import type { TaskRunner } from "../task-runner/TaskRunner.interface.js";
import { toTaskFilter } from "../task-runner/toTaskFilter.js";
import type { LifecycleNotifier } from "./LifecycleNotifier.js";
import type { TranslationTask } from "./types.js";
import { stillOwed } from "./stillOwed.js";
import { taskFromInput, taskFromStored } from "./taskMapping.js";

async function stopping(runner: TaskRunner, taskIds: string[]): Promise<TranslationTask[]> {
  if (!runner.findByIds || taskIds.length === 0) return [];
  return stillOwed(await runner.findByIds(taskIds)).map(taskFromStored);
}

/**
 * Wrap a {@link TaskRunner} so it reports to the host; every method otherwise delegates unchanged.
 *
 * `queued` is raised before the wrapped runner is asked: a runner may translate inline and report
 * `completed` from inside that call.
 *
 * `cancel` awaits its announcements before delegating — the records are gone afterwards.
 *
 * @since 0.16.0 `cancel` announces; `enqueue` answers with the handles.
 */
export function withQueuedNotification(
  runner: TaskRunner,
  notifier: LifecycleNotifier
): TaskRunner {
  return {
    async enqueue(tasks, scope) {
      await Promise.all(tasks.map((task) => notifier.queued(taskFromInput(task))));
      return runner.enqueue(tasks, scope);
    },
    async cancel(taskIds) {
      await notifier.cancelling(() => stopping(runner, taskIds));
      return runner.cancel(taskIds);
    },
    run: (taskId) => runner.run(taskId),
    // Normalized rather than forwarded as-is: the wrapper's own signature comes from the overload
    // pair, so it cannot pass the deprecated array form straight through.
    findByCollection: (collectionSlug, filter) =>
      runner.findByCollection(collectionSlug, toTaskFilter(filter)),
    ...(runner.findByIds ? { findByIds: (ids: string[]) => runner.findByIds!(ids) } : {}),
  };
}
