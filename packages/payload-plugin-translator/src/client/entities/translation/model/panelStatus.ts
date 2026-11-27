/** The single aggregate signal shown on the document's translate trigger; detail lives in the panel. */
export type PanelStatus =
  | { kind: "failed" }
  | { kind: "running" }
  | { kind: "stale"; staleLocales: string[] }
  | { kind: "fresh" }
  | { kind: "none" };

/** The marker tones — every panel state except `none` (which shows no marker). */
export type MarkerTone = Exclude<PanelStatus["kind"], "none">;

type DotColor = "red" | "green" | "blue" | "amber";

/** Dot colour + motion per marker tone; only work in flight pulses. */
export const MARKER_DOT: Record<MarkerTone, { color: DotColor; animated?: boolean }> = {
  failed: { color: "red" },
  running: { color: "blue", animated: true },
  stale: { color: "amber" },
  fresh: { color: "green" },
};

/**
 * Map an aggregate {@link PanelStatus} to the trigger marker's tone + hover/AT text. `fallbackTitle`
 * is the "nothing to signal" label.
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
