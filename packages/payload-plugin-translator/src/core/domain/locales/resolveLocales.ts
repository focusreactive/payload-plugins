/**
 * The single, canonical home for the locale-set invariants shared by every enqueue path: dedup,
 * unknown-locale dropping, and source-locale exclusion. Previously each was hand-written in 2–3 places
 * (the manual `/enqueue` resolver, the auto-translate config-time filter, and the auto-translate runtime
 * task builder), which risked silent drift if one copy changed. These are the primitives; each path
 * composes the ones it needs at whatever phase it runs (manual: one shot at request time; auto: dedup +
 * unknown-drop at config time, source-exclusion per-document at runtime).
 *
 * Consumed as a namespace — the barrel re-exports this module as `Locales`, so call sites read
 * `Locales.dedupe(...)` / `Locales.resolveTargets(...)`. Members are named for that dotted form (no
 * `Locales` suffix), since the namespace carries the domain.
 *
 * Payload-free (plain `string[]` / `Set<string>`), so it stays a pure kernel usable from both the
 * server features and the auto-translate module without pulling framework types in. Not part of the
 * plugin's public API — an implementation detail of the enqueue paths.
 *
 * @internal
 */

/** Whether a single locale code is one of the configured locales. The atomic "is this known?" check
 * that {@link dropUnknown} is built on — shared so "unknown locale" means one thing everywhere. */
export function isKnown(locale: string, known: Set<string>): boolean {
  return known.has(locale);
}

/** Remove duplicate locale codes, preserving first-seen order. */
export function dedupe(locales: string[]): string[] {
  return [...new Set(locales)];
}

/** Split a locale list into those that are configured (`kept`) and those that are not (`dropped`),
 * preserving order within each. */
export function dropUnknown(
  locales: string[],
  known: Set<string>
): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const locale of locales) {
    (isKnown(locale, known) ? kept : dropped).push(locale);
  }
  return { kept, dropped };
}

/** Remove the source locale from a target list; report whether it was present (so the caller can note
 * it was excluded). */
export function excludeSource(
  targets: string[],
  source: string
): { kept: string[]; wasPresent: boolean } {
  const kept = targets.filter((target) => target !== source);
  return { kept, wasPresent: kept.length !== targets.length };
}

/**
 * Resolved target locales for a manual enqueue, plus what was dropped so the handler can log precisely.
 */
export type ResolvedTargets = {
  /** The concrete locales to fan out to — de-duplicated, source excluded, unknown removed. */
  targets: string[];
  /** Requested locales that are not configured (dropped). */
  droppedUnknown: string[];
  /** Whether the source locale was requested as a target and excluded. */
  droppedSource: boolean;
};

/**
 * One-shot resolution for the manual enqueue path: coerce scalar→array, then dedup → exclude source →
 * drop unknown, in that order. A pure composition of the primitives above.
 *
 * @param knownLocales - the configured locale codes. Never null: the caller must reject a
 *   localization-less config before reaching here (translating without localization has no valid target
 *   and would corrupt data), so "no localization" is not representable as an input.
 */
export function resolveTargets(args: {
  target_lng: string | string[];
  source_lng: string;
  knownLocales: Set<string>;
}): ResolvedTargets {
  const { target_lng, source_lng, knownLocales } = args;
  const requested = Array.isArray(target_lng) ? target_lng : [target_lng];
  const { kept: withoutSource, wasPresent: droppedSource } = excludeSource(
    dedupe(requested),
    source_lng
  );
  const { kept: targets, dropped: droppedUnknown } = dropUnknown(withoutSource, knownLocales);
  return { targets, droppedUnknown, droppedSource };
}
