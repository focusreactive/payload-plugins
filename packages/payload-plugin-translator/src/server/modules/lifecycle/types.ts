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
};
