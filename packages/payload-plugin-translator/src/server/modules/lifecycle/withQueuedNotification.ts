import type { TaskRunner } from "../task-runner/TaskRunner.interface.js";
import { toTaskFilter } from "../task-runner/toTaskFilter.js";
import type { LifecycleNotifier } from "./LifecycleNotifier.js";
import { taskFromInput, taskFromStored } from "./taskMapping.js";
import type { TranslationLifecycleCallbacks } from "./types.js";

/**
 * Whether a host's callbacks need the runner wrapped at all — only the two the decorator itself
 * fires count; `onCompleted` and `onFailed` come from the task handler, which needs no decoration.
 */
export const needsDecoration = (callbacks: TranslationLifecycleCallbacks): boolean =>
  Boolean(callbacks.onQueued ?? callbacks.onCancelled);

/**
 * Say what is about to stop, while the rows still exist to say it from: the cancel route is handed
 * ids and nothing else. A failed read is logged rather than thrown — silence would otherwise be
 * indistinguishable from an id that was not ours. A locale whose last attempt failed is announced
 * too: from the row alone, "failed with retries left" and "gave up" read the same.
 */
async function announceCancellation(
  runner: TaskRunner,
  notifier: LifecycleNotifier,
  taskIds: string[]
): Promise<void> {
  if (!runner.findByIds || taskIds.length === 0) return;
  try {
    const stopping = await runner.findByIds(taskIds);
    for (const task of stopping) {
      if (task.status === "completed") continue;
      await notifier.cancelled(taskFromStored(task));
    }
  } catch (error) {
    notifier.announcementFailed(error);
  }
}

/**
 * Decorate a {@link TaskRunner} so `enqueue` fires `queued` and `cancel` announces what stops.
 *
 * `queued` fires BEFORE delegating: a synchronous runner may execute a task inline during `enqueue`
 * and fire `completed`, so this preserves queued → completed — and is why `queued` carries no job id.
 *
 * Every method is listed by hand below: an OPTIONAL one added to {@link TaskRunner} and not listed
 * vanishes from the wrapper silently. `findByIds` already went missing that way once.
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
      await announceCancellation(runner, notifier, taskIds);
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
