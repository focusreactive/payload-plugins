export function pickUniformBucket<T extends object>(variants: T[], getBucket: (v: T) => string) {
  const idx = Math.floor(Math.random() * (variants.length + 1));

  if (idx === variants.length) return "original";

  const selected = variants[idx];

  return selected !== undefined ? getBucket(selected) : "original";
}
