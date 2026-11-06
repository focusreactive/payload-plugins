import type { DocumentTranslationStatus } from "./enums.js";
import type { DocumentStaleness, DocumentTranslation } from "./types.js";

const RUN_OWNED_STATES = ["failed", "abandoned", "running", "pending"] as const;

type RunOwnedState = (typeof RUN_OWNED_STATES)[number];

const RUN_OWNED: ReadonlySet<string> = new Set(RUN_OWNED_STATES);

const isRunOwned = (state: string): state is RunOwnedState => RUN_OWNED.has(state);

export type TranslationRowState = RunOwnedState | "stale" | "translated";

export type TranslationStatusRow = {
  /** Stable key — the target locale (one row per target). */
  targetLocale: string;
  sourceLocale: string;
  state: TranslationRowState;
  /** ISO timestamp for the row's caption (translation time, or the job's last update). */
  at?: string;
  /** Present only while the run owns the row's state. */
  jobId?: string;
  /** Failure reason, present only for `state === "failed"`, so the row can surface why it failed. */
  error?: string;
};

/**
 * Must be one of Payload's `ColorIndicator` colours.
 */
export type StatusDotColor = "red" | "green" | "blue" | "gray" | "amber";

export const STATE_DOT: Record<TranslationRowState, { color: StatusDotColor; animated?: boolean }> =
  {
    failed: { color: "red" },
    abandoned: { color: "gray" },
    running: { color: "blue", animated: true },
    pending: { color: "gray" },
    stale: { color: "amber" },
    translated: { color: "green" },
  };

const localePairKey = (row: TranslationStatusRow): string =>
  `${row.sourceLocale}:${row.targetLocale}`;

const ROW_STATE: Record<DocumentTranslationStatus, TranslationRowState> = {
  pending: "pending",
  running: "running",
  failed: "failed",
  abandoned: "abandoned",
  completed: "translated",
};

const toRowState = (jobStatus: DocumentTranslationStatus): TranslationRowState =>
  ROW_STATE[jobStatus];

/**
 * One status row per target locale: stored staleness, with each live run overlaid onto its locale.
 *
 * Every run is overlaid, not just the latest, so concurrent re-translations each show their own
 * state instead of the last one appearing to overwrite the rest.
 *
 * Ordered by the source→target locale pair, never by state, so re-translating a locale does not
 * move its row.
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
    const runOwned = isRunOwned(state);
    if (runOwned || !byTarget.has(target)) {
      byTarget.set(target, {
        targetLocale: target,
        sourceLocale: run.input.source_lng,
        state,
        at: run.updated_at,
        jobId: runOwned ? run.id : undefined,
        error: run.status === "failed" ? run.error?.message : undefined,
      });
    }
  }

  // Stable order by the source→target locale pair — the one thing about a row that never changes when
  // its state does. Sorting by state/time instead would make a row jump (e.g. to the top) the moment
  // you re-translate it; the locale pair keeps every row in a fixed place, and progress is conveyed by
  // the badge/dot, not the position. The pair is unique (one row per target), so no tie-break needed.
  return [...byTarget.values()].sort((a, b) => localePairKey(a).localeCompare(localePairKey(b)));
}
