/**
 * Descriptor passed to the lifecycle callbacks — a stable, framework-neutral view of one translation
 * task. Mirrors the fields the runner already threads through; `publishOnTranslation` is intentionally
 * omitted (an internal write concern, not lifecycle-relevant). `id` is a string: the plugin is
 * ID-agnostic and normalizes every document id to a string at ingress.
 *
 * @since 0.7.0
 */
export type TranslationTask = {
  collection: string;
  id: string;
  sourceLng: string;
  targetLng: string;
  /**
   * The resolution strategy for the task. Deliberately widened to `string` (not the internal
   * `"overwrite" | "skip_existing"` union) so adding a strategy is not a breaking change to this
   * public type; host callbacks should treat unknown values gracefully.
   */
  strategy: string;
  /**
   * The job that will run this locale. Absent when the runner answers `enqueue` with nothing (see
   * docs/DEPRECATIONS.md#enqueue-void-return), and always absent on `onQueued` — the job does not
   * exist yet when that fires.
   *
   * @since 0.16.0
   */
  jobId?: string;
  /**
   * Which attempt at this locale the job is on, counting from 1 — the only field that differs
   * between the callbacks of a retried task. It counts the job's attempts at the locale, not the
   * caller's: a request that joins a job which already failed this locale sees the job's next
   * number, not 1. Absent when the runner does not retry or cannot say.
   *
   * @since 0.16.0
   */
  attempt?: number;
};

/**
 * Optional server-side hooks the host can supply to react to translation lifecycle events, passed as
 * the plugin's `lifecycle` config object. Always available (no schema, no migration) and independent
 * of the `provenance` opt-in. A throwing callback never fails the translation — it is caught and
 * logged (see {@link LifecycleNotifier}).
 *
 * `onCompleted` / `onFailed` fire per **execution attempt**: the Payload Jobs runner may retry a
 * failed task, so a task that fails then succeeds fires `onFailed` on each failed attempt and
 * `onCompleted` on the one that succeeds. `onQueued` fires once, when the task is enqueued.
 *
 * @since 0.7.0
 */
export type TranslationLifecycleCallbacks = {
  /**
   * Fired for each task as it is queued. Best-effort: emitted just before the task is handed to the
   * runner, so if enqueueing then throws it may fire for a task that never actually queued.
   *
   * @since 0.7.0
   */
  onQueued?: (task: TranslationTask) => void | Promise<void>;
  /** Fired after a task completes without error. @since 0.7.0 */
  onCompleted?: (task: TranslationTask) => void | Promise<void>;
  /** Fired when a task's translation throws, with the error. @since 0.7.0 */
  onFailed?: (task: TranslationTask, error: unknown) => void | Promise<void>;
  /**
   * A queued translation was cancelled: once per target locale the cancelled job covered, fired
   * before the row is deleted. A job that finishes between the read and the delete still reports as
   * cancelled. Never fires for a runner whose `TaskRunner` cannot resolve job ids by id.
   *
   * @since 0.16.0
   */
  onCancelled?: (task: TranslationTask) => void | Promise<void>;
};
