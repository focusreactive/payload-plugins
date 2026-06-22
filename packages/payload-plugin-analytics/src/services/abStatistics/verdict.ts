import type { TwoProportionZTestResult, Verdict } from "./types";

/**
 * Verdict label: "winner"/"loser" when significant with positive/negative
 * lift, "ns" when not significant, "none" when there is no test.
 */
export function verdict(
  test: Pick<TwoProportionZTestResult, "pValue" | "relativeLift"> | null,
  alpha = 0.05
): Verdict {
  if (test == null) return "none";
  if (test.pValue < alpha && test.relativeLift > 0) return "winner";
  if (test.pValue < alpha && test.relativeLift < 0) return "loser";

  return "ns";
}
