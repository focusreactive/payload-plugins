import { DocumentTranslationStatus } from "./enums.js";
import type { StatusDotColor } from "./statusRows.js";
import type { CollectionTranslationPanel, DocumentTranslation } from "./types.js";

/**
 * The single aggregate signal shown on a translate trigger (document or collection). Detail lives in
 * the popup; the panel only surfaces the most urgent state at a glance (see the panel-UI design doc).
 */
export type PanelStatus =
  | { kind: "failed" }
  | { kind: "running" }
  | { kind: "stale"; staleLocales: string[] }
  | { kind: "fresh" }
  | { kind: "none" };

/** The marker tones — every panel state except `none` (which shows no marker). */
export type MarkerTone = Exclude<PanelStatus["kind"], "none">;

/**
 * Dot colour + motion per aggregate marker tone. Mirrors the status list's `STATE_DOT` vocabulary
 * (failed=red, in-progress=blue+pulse, stale=amber, fresh=green) so the trigger badge and the popup
 * rows read as one system.
 */
export const MARKER_DOT: Record<MarkerTone, { color: StatusDotColor; animated?: boolean }> = {
  failed: { color: "red" },
  running: { color: "blue", animated: true },
  stale: { color: "amber" },
  fresh: { color: "green" },
};

/**
 * Map an aggregate {@link PanelStatus} to the trigger marker's tone + hover/AT text. Shared by the
 * document and collection triggers so both name their states the same way. `fallbackTitle` is the
 * "nothing to signal" label (each surface passes its own, e.g. "Translate this document").
 */
export function describePanelStatus(
  status: PanelStatus | undefined,
  fallbackTitle: string
): { tone?: MarkerTone; title: string } {
  switch (status?.kind) {
    case "failed":
      return { tone: "failed", title: "Last translation failed" };
    case "running":
      return { tone: "running", title: "Translation in progress…" };
    case "stale":
      return {
        tone: "stale",
        title: `Out of date: ${status.staleLocales.map((l) => l.toLowerCase()).join(", ")}`,
      };
    case "fresh":
      return { tone: "fresh", title: "Translations up to date" };
    default:
      return { title: fallbackTitle };
  }
}

/**
 * How urgently each job status wants the single aggregate marker — lowest wins. `null` is a status
 * the trigger deliberately does not surface. A total record rather than a list, so a status added
 * later cannot be left out in silence.
 */
const RUN_STATUS_RANK: Record<DocumentTranslationStatus, number | null> = {
  [DocumentTranslationStatus.FAILED]: 0,
  [DocumentTranslationStatus.RUNNING]: 1,
  [DocumentTranslationStatus.PENDING]: 2,
  [DocumentTranslationStatus.ABANDONED]: 3,
  [DocumentTranslationStatus.COMPLETED]: 4,
};

/**
 * Collapse the per-locale job feed into the single most-urgent run status for the trigger marker.
 * Returns `undefined` when there are no jobs. The panel shows one aggregate signal; the popup's list
 * carries the full per-locale detail.
 */
export function deriveDocumentRunStatus(
  runs: DocumentTranslation[] | undefined
): DocumentTranslationStatus | undefined {
  let mostUrgent: DocumentTranslationStatus | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const run of runs ?? []) {
    const rank = RUN_STATUS_RANK[run.status];
    if (rank !== null && rank < bestRank) {
      bestRank = rank;
      mostUrgent = run.status;
    }
  }
  return mostUrgent;
}

type PanelStatusInput = {
  /** Status of the most-urgent translation job across locales, if any (see `deriveDocumentRunStatus`). */
  runStatus?: DocumentTranslationStatus | null;
  /** Target locales whose translation is out of date (from staleness detection). */
  staleLocales: string[];
};

/**
 * Collapse the latest run status + per-locale staleness into one panel marker, by priority:
 * `failed → running → stale → fresh → none`. A more urgent transient state (a failed or in-flight
 * job) outranks the durable "out of date" signal; `fresh` means a completed translation with nothing
 * stale; `none` means nothing has been translated yet.
 *
 * A locale the run gave up before reaching shares the `failed` marker: the run it belonged to did
 * fail, and the locale needs the same attention as one that was tried and failed.
 */
export function derivePanelStatus({ runStatus, staleLocales }: PanelStatusInput): PanelStatus {
  if (
    runStatus === DocumentTranslationStatus.FAILED ||
    runStatus === DocumentTranslationStatus.ABANDONED
  ) {
    return { kind: "failed" };
  }
  if (
    runStatus === DocumentTranslationStatus.RUNNING ||
    runStatus === DocumentTranslationStatus.PENDING
  ) {
    return { kind: "running" };
  }
  if (staleLocales.length > 0) return { kind: "stale", staleLocales };
  if (runStatus === DocumentTranslationStatus.COMPLETED) return { kind: "fresh" };
  return { kind: "none" };
}

/**
 * The one marker a collection's trigger shows. Work in flight outranks a failure: it self-resolves,
 * so a failure surfaces only once nothing is running.
 */
export function deriveCollectionPanelStatus(
  panel: CollectionTranslationPanel | undefined
): PanelStatus {
  if (!panel) return { kind: "none" };
  const { counts } = panel;
  if (counts.running > 0 || counts.pending > 0) return { kind: "running" };
  if (counts.failed > 0) return { kind: "failed" };
  return { kind: "none" };
}
