export interface WeightedValue {
  value: number;
  weight: number;
}

export function computeWeightedValuesAverage(weightedValues: WeightedValue[]) {
  const totalW = weightedValues.reduce((a, s) => a + s.weight, 0);

  if (totalW === 0) return 0;

  return weightedValues.reduce((a, s) => a + s.value * s.weight, 0) / totalW;
}
