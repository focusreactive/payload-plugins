import type { QualifyInput, QualifyOpts } from "./types";
import { minimumDetectableEffect } from "./minimumDetectableEffect";

/**
 * Qualified for the win-rate denominator: SRM passes, the session floor is met,
 * and the relative MDE at the current sample is at or below the ceiling.
 */
export function isQualified(input: QualifyInput, opts: QualifyOpts) {
  if (!input.srmPassed) return false;
  if (input.minBucketSessions < opts.sessionFloor) return false;

  const detectableEffect = minimumDetectableEffect(
    input.controlRate,
    input.minBucketSessions,
    opts.alpha,
    opts.power
  );

  if (!detectableEffect) return false;

  return detectableEffect.relative <= opts.mdeCeiling;
}
