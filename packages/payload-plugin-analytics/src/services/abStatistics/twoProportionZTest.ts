import type { TwoProportionZTestResult } from "./types";
import { standardNormalCdf } from "./standardNormalCdf";

/**
 * Two-tailed two-proportion z-test of variant vs control.
 * Returns each rate, the absolute/relative lift, the z statistic, and the p-value.
 */
export function twoProportionZTest(
  variantConversions: number,
  variantSessions: number,
  controlConversions: number,
  controlSessions: number,
): TwoProportionZTestResult {
  const variantRate = variantSessions > 0 ? variantConversions / variantSessions : 0;
  const controlRate = controlSessions > 0 ? controlConversions / controlSessions : 0;

  const result: TwoProportionZTestResult = {
    variantRate,
    controlRate,
    absoluteLift: variantRate - controlRate,
    relativeLift: controlRate > 0 ? (variantRate - controlRate) / controlRate : 0,
    zScore: 0,
    pValue: 1,
  };

  if (!variantSessions || !controlSessions) return result;

  const pooledRate = (variantConversions + controlConversions) / (variantSessions + controlSessions);
  const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / variantSessions + 1 / controlSessions));

  if (standardError <= 0) return result;

  result.zScore = (variantRate - controlRate) / standardError;
  result.pValue = 2 * (1 - standardNormalCdf(Math.abs(result.zScore)));

  return result;
}
