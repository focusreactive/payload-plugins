export type LoadingSize = "sm" | "md" | "lg";

/** Bars per size — a small control with five bars reads as noise, so the count scales down. */
const BAR_COUNT: Record<LoadingSize, number> = {
  sm: 3,
  md: 4,
  lg: 5,
};

/** Square/narrow hosts (icon buttons) always use the minimum so the bars fit the width. */
const COMPACT_BAR_COUNT = 2;

/** How many animated bars the loading indicator renders for a given host size. */
export function getBarCount(size: LoadingSize, compact?: boolean): number {
  return compact ? COMPACT_BAR_COUNT : BAR_COUNT[size];
}
