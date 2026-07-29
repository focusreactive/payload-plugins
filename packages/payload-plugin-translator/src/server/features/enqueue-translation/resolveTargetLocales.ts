/**
 * Resolved target locales for a manual enqueue, plus what was dropped so the handler can log precisely.
 */
export type ResolvedTargetLocales = {
  /** The concrete locales to fan out to — de-duplicated, source excluded, unknown removed. */
  targets: string[];
  /** Requested locales that are not configured (dropped). */
  droppedUnknown: string[];
  /** Whether the source locale was requested as a target and excluded. */
  droppedSource: boolean;
};

/**
 * Normalize the enqueue `target_lng` input (scalar or array) into the concrete list of target locales
 * to translate into. Applies, in order: array-coercion, de-duplication (first-seen order preserved),
 * source-locale exclusion, and dropping unknown (unconfigured) locales.
 *
 * De-dup and unknown-dropping are the manual-enqueue counterparts of the auto-translate policy filter:
 * the runner only supersedes against already-stored jobs, so duplicates within one enqueue must be
 * collapsed here; and an unknown locale must never reach the pipeline — it burns a provider call and
 * either errors on a Postgres locale enum or writes orphaned, invisible data on Mongo/SQLite.
 *
 * @param knownLocales - the configured locale codes. Never null: the caller must reject a
 *   localization-less config before reaching here (translating without localization has no valid
 *   target and would corrupt data), so "no localization" is not representable as an input.
 */
export function resolveTargetLocales(args: {
  target_lng: string | string[];
  source_lng: string;
  knownLocales: Set<string>;
}): ResolvedTargetLocales {
  const { target_lng, source_lng, knownLocales } = args;
  const requested = Array.isArray(target_lng) ? target_lng : [target_lng];
  const deduped = [...new Set(requested)];
  const droppedSource = deduped.includes(source_lng);
  const withoutSource = deduped.filter((target) => target !== source_lng);
  const droppedUnknown = withoutSource.filter((target) => !knownLocales.has(target));
  const targets = withoutSource.filter((target) => knownLocales.has(target));
  return { targets, droppedUnknown, droppedSource };
}
