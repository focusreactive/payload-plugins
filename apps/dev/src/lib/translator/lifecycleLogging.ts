import type { TranslationLifecycleCallbacks } from "@focus-reactive/payload-plugin-translator";

export const loggingLifecycle: TranslationLifecycleCallbacks = {
  onQueued: (task) =>
    console.info(
      `[lifecycle] queued    ${task.collection}#${task.id} ${task.sourceLng}→${task.targetLng}`
    ),
  onCompleted: (task) =>
    console.info(
      `[lifecycle] completed ${task.collection}#${task.id} ${task.sourceLng}→${task.targetLng}`
    ),
  onFailed: (task, error) =>
    console.error(
      `[lifecycle] failed    ${task.collection}#${task.id}:`,
      error instanceof Error ? error.message : error
    ),
  onAbandoned: (task) =>
    console.warn(
      `[lifecycle] abandoned ${task.collection}#${task.id} ${task.sourceLng}→${task.targetLng}`
    ),
};
