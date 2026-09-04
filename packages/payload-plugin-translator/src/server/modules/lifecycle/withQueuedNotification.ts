import type { TaskRunner } from "../task-runner/TaskRunner.interface";
import { toTaskFilter } from "../task-runner/toTaskFilter";
import type { LifecycleNotifier } from "./LifecycleNotifier";
import { taskFromInput } from "./taskMapping";

/**
 * Decorate a {@link TaskRunner} so `enqueue` fires the `queued` lifecycle callback for each task.
 * Fired BEFORE delegating: a synchronous runner (the sync runner) may execute a task inline during
 * `enqueue` and fire `completed`, so emitting `queued` first preserves the queued → completed order.
 * All other methods delegate unchanged.
 */
export function withQueuedNotification(
  runner: TaskRunner,
  notifier: LifecycleNotifier
): TaskRunner {
  return {
    async enqueue(tasks) {
      await Promise.all(tasks.map((task) => notifier.queued(taskFromInput(task))));
      await runner.enqueue(tasks);
    },
    cancel: (taskIds) => runner.cancel(taskIds),
    run: (taskId) => runner.run(taskId),
    // Normalized rather than forwarded as-is: the wrapper's own signature comes from the overload
    // pair, so it cannot pass the deprecated array form straight through.
    findByCollection: (collectionSlug, filter) =>
      runner.findByCollection(collectionSlug, toTaskFilter(filter)),
  };
}
