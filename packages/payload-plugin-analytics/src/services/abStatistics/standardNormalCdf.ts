/**
 * Standard normal CDF Φ(x) - cumulative function of the standard normal distribution.
 * Φ(x) indicates the probability that a random variable will take a value less than or equal to the number x.
 */
export function standardNormalCdf(x: number): number {
  if (x < 0) return 1 - standardNormalCdf(-x);

  const pdfNormalizer = 0.39894228, // 1 / √(2π), the standard normal PDF coefficient
    polyCoeff1 = 0.31938153,
    polyCoeff2 = -0.356563782,
    polyCoeff3 = 1.781477937,
    polyCoeff4 = -1.821255978,
    polyCoeff5 = 1.330274429,
    tSubstitutionScale = 0.2316419; // constant in the t = 1 / (1 + p·x) substitution

  const t = 1 / (1 + tSubstitutionScale * x);

  return 1 - pdfNormalizer * Math.exp((-x * x) / 2) * t * (t * (t * (t * (t * polyCoeff5 + polyCoeff4) + polyCoeff3) + polyCoeff2) + polyCoeff1);
}
