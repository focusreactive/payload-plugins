import type { Status } from "./types";

export function scoreToStatus(score: number): Status {
  if (score > 7) return "good";
  if (score > 4) return "warn";

  return "bad";
}

export function fleschToStatus(score: number): Status {
  if (score >= 60) return "good";
  if (score >= 50) return "warn";

  return "bad";
}

const WEIGHT: Record<Status, number> = { good: 1, warn: 0.5, bad: 0 };

export function statusToRing(checks: { status: Status }[]): number {
  if (checks.length === 0) return 100;

  const sum = checks.reduce((acc, c) => acc + WEIGHT[c.status], 0);

  return Math.round((sum / checks.length) * 100);
}

export function ringToStatus(ring: number): Status {
  if (ring >= 80) return "good";
  if (ring >= 50) return "warn";

  return "bad";
}
