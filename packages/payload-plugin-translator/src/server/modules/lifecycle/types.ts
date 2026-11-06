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
   * The run translating this locale, as the enqueue answer named it. Every callback carries it,
   * `onQueued` included: the runner names the run before it says it took the work.
   *
   * Optional because a runner written outside this package may answer an enqueue with nothing.
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
 * Each fires once per target locale, never per attempt — a runner's retries are not reported. A
 * host that counts locales still owed must listen to all four endings, and to `onCancelled`'s
 * caveat below: a locale already in flight may be announced cancelled and still complete.
 *
 * @since 0.16.0 `onFailed` reports a final outcome; it previously fired on every failed attempt.
 *
 * @since 0.7.0
 */
export type TranslationLifecycleCallbacks = {
  /**
   * Fires before `enqueue` answers, for each locale the runner accepted.
   *
   * @since 0.16.0 fires for work the runner has taken, so it no longer fires for a locale that
   * failed to queue.
   *
   * @since 0.7.0
   */
  onQueued?: (task: TranslationTask) => void | Promise<void>;
  /** @since 0.7.0 */
  onCompleted?: (task: TranslationTask) => void | Promise<void>;
  /**
   * Fired once for a locale that was attempted and failed.
   *
   * @since 1.0.0 no longer fires for a locale the run never reached — see {@link
   * TranslationLifecycleCallbacks.onAbandoned}.
   *
   * @since 0.7.0
   */
  onFailed?: (task: TranslationTask, error: unknown) => void | Promise<void>;
  /**
   * Fired once for a locale the run never attempted, because another locale's failure ended it.
   *
   * @since 1.0.0
   */
  onAbandoned?: (task: TranslationTask) => void | Promise<void>;
  /**
   * Once per target locale the run still owed, fired before the run's record is deleted, so a host
   * can still read it. A locale already in flight is announced and may then still complete.
   *
   * @since 0.16.0
   */
  onCancelled?: (task: TranslationTask) => void | Promise<void>;
};
