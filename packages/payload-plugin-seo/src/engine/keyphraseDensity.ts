// Yoast weighs density by keyphrase length before comparing it to its bounds.
export function keyphraseLengthFactor(keyphraseWords: number): number {
  return 0.7 + keyphraseWords / 3;
}

export const DENSITY_MAXIMUM = 3;

export function isDensityOverMaximum(densityPct: number, lengthFactor: number): boolean {
  return densityPct * lengthFactor > DENSITY_MAXIMUM;
}
