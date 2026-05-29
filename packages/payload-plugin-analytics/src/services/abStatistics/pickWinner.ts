import type { WinnerCandidate, WinnerOpts, WinnerPick } from "./types";
import { confidence } from "./confidence";

/**
 * Picks the crowned winner and the provisional leader among variant candidates.
 * The winner is the highest-confidence variant clearing significance, positive
 * lift, and the session floor; the leader is the highest-confidence variant overall.
 */
export function pickWinner(candidates: WinnerCandidate[], opts: WinnerOpts): WinnerPick {
  if (candidates.length === 0) {
    return {
      winnerBucket: null,
      leaderBucket: null,
    };
  }

  const confidenceThreshold = 1 - opts.alpha / 2;
  const byConfidence = [...candidates].sort((a, b) => confidence(b.zScore) - confidence(a.zScore));

  const leaderBucket = byConfidence[0]!.bucket;
  const winner = byConfidence.find(
    (c) =>
      confidence(c.zScore) >= confidenceThreshold && c.relativeLift > 0 && c.minBucketSessions >= opts.sessionFloor,
  );

  return {
    winnerBucket: winner?.bucket ?? null,
    leaderBucket,
  };
}
