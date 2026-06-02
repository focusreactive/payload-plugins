import type { SampleRatioMismatchResult } from "./types";

function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function lowerRegularizedGamma(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    let sum = 1 / s,
      term = 1 / s;
    for (let n = 1; n < 300; n++) {
      term *= x / (s + n);
      sum += term;
      if (term < sum * 1e-13) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }

  let b = x + 1 - s,
    c = 1e30,
    d = 1 / b,
    h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-13) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

/** Chi-square CDF with `degreesOfFreedom` degrees of freedom, evaluated at x. */
export function chiSquaredCdf(x: number, degreesOfFreedom: number) {
  if (x <= 0) return 0;

  return lowerRegularizedGamma(degreesOfFreedom / 2, x / 2);
}

/**
 * Chi-square goodness-of-fit test for Sample Ratio Mismatch.
 * `observedCounts`: per-bucket session counts. `expectedShares`: configured
 * fractions (Σ = 1). Fails when the split deviates more than `pValueThreshold`.
 */
export function sampleRatioMismatchCheck(observedCounts: number[], expectedShares: number[], pValueThreshold = 0.001): SampleRatioMismatchResult {
  const totalSessions = observedCounts.reduce((a, b) => a + b, 0);

  let chiSquared = 0;
  observedCounts.forEach((observed, i) => {
    const expected = totalSessions * expectedShares[i]!;
    if (expected > 0) chiSquared += ((observed - expected) * (observed - expected)) / expected;
  });

  const degreesOfFreedom = Math.max(1, observedCounts.length - 1);
  const pValue = 1 - chiSquaredCdf(chiSquared, degreesOfFreedom);

  return { chiSquared, degreesOfFreedom, pValue, passed: pValue >= pValueThreshold };
}
