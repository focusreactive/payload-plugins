import type { DocumentStaleness, DocumentTranslation } from "./types";

/**
 * One row in the unified per-locale STATUS list. Collapses what used to be three separate visual
 * treatments (the completed chip, the "out of date" list, and the running/pending/failed chips) into
 * a single consistent shape keyed by target locale.
 */
export type TranslationRowState = "failed" | "running" | "pending" | "stale" | "translated";

export type TranslationStatusRow = {
  /** Stable key — the target locale (one row per target). */
  targetLocale: string;
  sourceLocale: string;
  state: TranslationRowState;
  /** ISO timestamp for the row's caption (translation time, or the job's last update). */
  at?: string;
  /** Set together with a transient `state` (failed/running/pending) — the job id run/cancel act on. */
  jobId?: string;
  /** Failure reason, present only for `state === "failed"`, so the row can surface why it failed. */
  error?: string;
};

/** The status dot vocabulary (a `ColorIndicator` colour), shared by the list badge and the panel marker. */
export type StatusDotColor = "red" | "green" | "blue" | "gray" | "amber";

/**
 * Dot colour + motion per row state. Only the actively-processing state pulses, so motion means
 * "in progress now". The single source of truth for the status colour vocabulary — the panel
 * trigger marker mirrors it (see `MARKER_DOT`).
 */
export const STATE_DOT: Record<TranslationRowState, { color: StatusDotColor; animated?: boolean }> =
  {
    failed: { color: "red" },
    running: { color: "blue", animated: true },
    pending: { color: "gray" },
    stale: { color: "amber" },
    translated: { color: "green" },
  };

const TRANSIENT: ReadonlySet<TranslationRowState> = new Set(["failed", "running", "pending"]);

// A row's permanent identity for ordering: the source→target locale pair (unique per row, never
// changes when the row's state does).
const localePairKey = (row: TranslationStatusRow): string =>
  `${row.sourceLocale}:${row.targetLocale}`;

// Maps the closed 4-member job-status set to a row state. "completed" → "translated"; the transient
// three pass through. If a new DocumentTranslationStatus is ever added, extend this explicitly —
// otherwise it would silently render as "translated".
const toRowState = (jobStatus: string): TranslationRowState =>
  jobStatus === "failed" || jobStatus === "running" || jobStatus === "pending"
    ? jobStatus
    : "translated";

/**
 * Build the unified status rows from per-locale staleness + the latest job per target locale.
 *
 * Rows come from `staleness.locales` (one per translated target: `stale` or `translated`). Each job in
 * `runs` (one per target locale — see `useDocumentTranslation`) is overlaid onto its target locale: a
 * **transient** job state (failed/running/pending) wins over the durable signal for that locale, and a
 * job for a target with no provenance row yet adds a row. Overlaying *every* job (not just one) is what
 * lets several concurrent re-translations each show their own live state instead of the last one
 * appearing to overwrite the rest. Sorted by the fixed source→target locale pair (not by state), so a
 * row keeps its place when its state changes — re-translating a locale never reorders the list.
 */
export function buildTranslationStatusRows(input: {
  staleness?: DocumentStaleness | null;
  runs?: DocumentTranslation[];
}): TranslationStatusRow[] {
  const { staleness, runs } = input;
  const byTarget = new Map<string, TranslationStatusRow>();

  for (const locale of staleness?.locales ?? []) {
    byTarget.set(locale.target_lng, {
      targetLocale: locale.target_lng,
      sourceLocale: locale.source_lng,
      state: locale.is_stale ? "stale" : "translated",
      at: locale.translated_at,
    });
  }

  for (const run of runs ?? []) {
    const state = toRowState(run.status);
    const target = run.input.target_lng;
    const existing = byTarget.get(target);
    // Overlay the job only when it adds information: a transient state, or a locale not yet listed.
    if (TRANSIENT.has(state) || !existing) {
      byTarget.set(target, {
        targetLocale: target,
        sourceLocale: run.input.source_lng,
        state: existing && !TRANSIENT.has(state) ? existing.state : state,
        at: run.updated_at,
        jobId: TRANSIENT.has(state) ? run.id : existing?.jobId,
        error: run.status === "failed" ? run.error.message : undefined,
      });
    }
  }

  // Stable order by the source→target locale pair — the one thing about a row that never changes when
  // its state does. Sorting by state/time instead would make a row jump (e.g. to the top) the moment
  // you re-translate it; the locale pair keeps every row in a fixed place, and progress is conveyed by
  // the badge/dot, not the position. The pair is unique (one row per target), so no tie-break needed.
  return [...byTarget.values()].sort((a, b) => localePairKey(a).localeCompare(localePairKey(b)));
}
