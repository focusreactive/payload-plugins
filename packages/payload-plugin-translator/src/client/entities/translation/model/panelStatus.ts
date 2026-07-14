import { DocumentTranslationStatus } from "./enums";
import type { StatusDotColor } from "./statusRows";
import type { GroupedCollectionTranslationStatus } from "./types";

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

type PanelStatusInput = {
  /** Status of the latest translation job, if any. */
  runStatus?: DocumentTranslationStatus | null;
  /** Target locales whose translation is out of date (from staleness detection). */
  staleLocales: string[];
};

/**
 * Collapse the latest run status + per-locale staleness into one panel marker, by priority:
 * `failed → running → stale → fresh → none`. A more urgent transient state (a failed or in-flight
 * job) outranks the durable "out of date" signal; `fresh` means a completed translation with nothing
 * stale; `none` means nothing has been translated yet.
 */
export function derivePanelStatus({ runStatus, staleLocales }: PanelStatusInput): PanelStatus {
  if (runStatus === DocumentTranslationStatus.FAILED) return { kind: "failed" };
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
 * Collapse a collection's grouped job counts into one trigger marker. Priority:
 * `in-progress (running/pending) → failed → fresh → none`. In-progress outranks failures because
 * work is actively happening and self-resolves; once nothing is running, a failure is surfaced.
 * There is no `stale` here — staleness is a per-document signal, not tracked for the bulk dashboard.
 */
export function deriveCollectionPanelStatus(
  status: GroupedCollectionTranslationStatus | undefined
): PanelStatus {
  if (!status) return { kind: "none" };
  if (status.running.length > 0 || status.pending.length > 0) return { kind: "running" };
  if (status.failed.length > 0) return { kind: "failed" };
  if (status.completed.length > 0) return { kind: "fresh" };
  return { kind: "none" };
}
