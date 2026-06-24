import type { MockRow } from "./ga4RowBuilder";

interface Options {
  /** Index of the ref dimension within each input row's dimensionValues. */
  refIndex: number;
  /** Indices of the dimensions to KEEP (display dims), in output order. */
  keepDimIndices: number[];
  /** Allowed refs; null = keep all (no filtering). */
  allowed: Set<string> | null;
}

function dimVal(r: MockRow, i: number): string {
  return r.dimensionValues[i]?.value ?? "";
}

export function filterAndReaggregate(
  rows: MockRow[],
  { refIndex, keepDimIndices, allowed }: Options
): MockRow[] {
  const groups = new Map<string, { dims: string[]; metrics: number[] }>();

  for (const r of rows) {
    if (allowed && !allowed.has(dimVal(r, refIndex))) continue;

    const dims = keepDimIndices.map((i) => dimVal(r, i));
    const key = dims.join(" ");
    const metrics = r.metricValues.map((m) => Number(m.value ?? "0"));

    const existing = groups.get(key);
    if (existing) {
      for (let i = 0; i < metrics.length; i++)
        existing.metrics[i] = (existing.metrics[i] ?? 0) + (metrics[i] ?? 0);
    } else {
      groups.set(key, { dims, metrics });
    }
  }

  return [...groups.values()].map((g) => ({
    dimensionValues: g.dims.map((value) => ({ value })),
    metricValues: g.metrics.map((n) => ({ value: String(n) })),
  }));
}
