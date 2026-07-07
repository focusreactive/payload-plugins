import type { TranslationLifecycleCallbacks } from "@focus-reactive/payload-plugin-translator";

// Dev-only: log each translation lifecycle event so you can watch onQueued/onCompleted/onFailed fire
// end-to-end (e.g. trigger a translation from the admin UI in dry-run mode). Callbacks receive only the
// task descriptor (+ error for onFailed), so we log via console — the lines show in the dev server output.
export const loggingLifecycle: TranslationLifecycleCallbacks = {
  onQueued: (task) =>
    console.info(
      `[lifecycle] queued    ${task.collection}#${task.id} ${task.sourceLng}→${task.targetLng} (${task.strategy})`
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
};
