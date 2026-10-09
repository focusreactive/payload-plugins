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
   * The run translating this locale, as the enqueue answer named it.
   *
   * Absent on `onQueued`, which fires before the run exists — take it from the enqueue answer there.
   *
   * @since 0.16.0
   */
  handle?: string;
};

/**
 * Optional server-side hooks the host can supply to react to translation lifecycle events, passed as
 * the plugin's `lifecycle` config object. Always available (no schema, no migration) and independent
 * of the `provenance` opt-in. A throwing callback never fails the translation — it is caught and
 * logged (see {@link LifecycleNotifier}).
 *
 * Each fires once per target locale, never per attempt — a runner's retries are not reported.
 *
 * @since 0.16.0 `onFailed` reports a final outcome; it previously fired on every failed attempt.
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
  /**
   * Fired once when a locale will not be translated, with the failure that ended the run — which for
   * a locale that never started is not its own, because nothing ran for it to throw.
   *
   * @since 0.7.0
   */
  onFailed?: (task: TranslationTask, error: unknown) => void | Promise<void>;
  /**
   * Once per target locale the run still owed, fired before the run's record is deleted, so a host
   * can still read it. A locale already in flight is announced and may then still complete.
   *
   * @since 0.16.0
   */
  onCancelled?: (task: TranslationTask) => void | Promise<void>;
};
