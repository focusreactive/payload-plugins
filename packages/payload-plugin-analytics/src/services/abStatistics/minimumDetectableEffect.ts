import type { MinimumDetectableEffectResult } from "./types";

/**
 * Inverse standard normal CDF Φ⁻¹(probability) - the inverse cumulative function of the standard normal distribution.
 * It takes a probability and returns a value on the X axis (the so-called z-score), which cuts off this probability.
 */
export function inverseStandardNormalCdf(probability: number): number {
  if (probability <= 0) return -Infinity;
  if (probability >= 1) return Infinity;

  const centralNumeratorCoeffs = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const centralDenominatorCoeffs = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const tailNumeratorCoeffs = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const tailDenominatorCoeffs = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const lowerTailBreakpoint = 0.02425;
  const upperTailBreakpoint = 1 - lowerTailBreakpoint;

  if (probability < lowerTailBreakpoint) {
    const tailVar = Math.sqrt(-2 * Math.log(probability));

    return (
      (((((tailNumeratorCoeffs[0]! * tailVar + tailNumeratorCoeffs[1]!) * tailVar + tailNumeratorCoeffs[2]!) * tailVar + tailNumeratorCoeffs[3]!) * tailVar + tailNumeratorCoeffs[4]!) * tailVar +
        tailNumeratorCoeffs[5]!) /
      ((((tailDenominatorCoeffs[0]! * tailVar + tailDenominatorCoeffs[1]!) * tailVar + tailDenominatorCoeffs[2]!) * tailVar + tailDenominatorCoeffs[3]!) * tailVar + 1)
    );
  } else if (probability <= upperTailBreakpoint) {
    const centeredProbability = probability - 0.5;
    const centeredProbabilitySquared = centeredProbability * centeredProbability;

    return (
      ((((((centralNumeratorCoeffs[0]! * centeredProbabilitySquared + centralNumeratorCoeffs[1]!) * centeredProbabilitySquared + centralNumeratorCoeffs[2]!) * centeredProbabilitySquared +
        centralNumeratorCoeffs[3]!) *
        centeredProbabilitySquared +
        centralNumeratorCoeffs[4]!) *
        centeredProbabilitySquared +
        centralNumeratorCoeffs[5]!) *
        centeredProbability) /
      (((((centralDenominatorCoeffs[0]! * centeredProbabilitySquared + centralDenominatorCoeffs[1]!) * centeredProbabilitySquared + centralDenominatorCoeffs[2]!) * centeredProbabilitySquared +
        centralDenominatorCoeffs[3]!) *
        centeredProbabilitySquared +
        centralDenominatorCoeffs[4]!) *
        centeredProbabilitySquared +
        1)
    );
  }

  const tailVar = Math.sqrt(-2 * Math.log(1 - probability));

  return -(
    (((((tailNumeratorCoeffs[0]! * tailVar + tailNumeratorCoeffs[1]!) * tailVar + tailNumeratorCoeffs[2]!) * tailVar + tailNumeratorCoeffs[3]!) * tailVar + tailNumeratorCoeffs[4]!) * tailVar +
      tailNumeratorCoeffs[5]!) /
    ((((tailDenominatorCoeffs[0]! * tailVar + tailDenominatorCoeffs[1]!) * tailVar + tailDenominatorCoeffs[2]!) * tailVar + tailDenominatorCoeffs[3]!) * tailVar + 1)
  );
}

/**
 * Minimum Detectable Effect at the current sample size.
 * `controlRate` = control CR, `sampleSize` = per-bucket sample (use the smaller
 * bucket, conservative). Returns absolute (proportion) and relative (fraction).
 */
export function minimumDetectableEffect(controlRate: number, sampleSize: number, alpha = 0.05, power = 0.8): MinimumDetectableEffectResult | null {
  if (!sampleSize || controlRate <= 0) return null;

  const zCritical = inverseStandardNormalCdf(1 - alpha / 2); // 1.96
  const zPower = inverseStandardNormalCdf(power); // 0.84

  const pooledStandardError = Math.sqrt((2 * controlRate * (1 - controlRate)) / sampleSize);
  const absolute = (zCritical + zPower) * pooledStandardError;

  return {
    absolute,
    relative: absolute / controlRate,
  };
}
