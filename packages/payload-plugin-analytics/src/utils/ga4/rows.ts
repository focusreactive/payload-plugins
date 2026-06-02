export interface Ga4Row {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
}

export function dim(row: Ga4Row, i: number): string {
  return row.dimensionValues?.[i]?.value ?? "";
}

export function metricInt(row: Ga4Row, i: number): number {
  const raw = row.metricValues?.[i]?.value;
  const n = raw == null ? 0 : parseInt(raw, 10);

  return Number.isFinite(n) ? n : 0;
}
