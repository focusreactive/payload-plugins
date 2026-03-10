import { pickUniformBucket } from "./pickUniformBucket";

export function pickWeightedBucket<T extends object>(
  variants: T[],
  getBucket: (v: T) => string,
  getPassPercentage: (v: T) => number,
) {
  const totalVariantWeight = variants.reduce((sum, v) => sum + getPassPercentage(v), 0);
  const originalWeight = Math.max(0, 100 - totalVariantWeight);
  const total = totalVariantWeight + originalWeight;

  if (totalVariantWeight === 0) return pickUniformBucket(variants, getBucket);

  const rand = Math.random() * total;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += getPassPercentage(variant);

    if (rand < cumulative) return getBucket(variant);
  }

  return "original";
}
