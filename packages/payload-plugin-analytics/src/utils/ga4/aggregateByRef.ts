import type { Row } from "../../types/query";

export function aggregateByRef(
  rows: Row[],
  refIndex: number,
  metricArity: number
): Map<string, number[]> {
  const out = new Map<string, number[]>();

  for (const row of rows) {
    const ref = row.dimensionValues?.[refIndex]?.value ?? "";
    if (!ref) continue;

    const acc = out.get(ref) ?? new Array(metricArity).fill(0);

    for (let i = 0; i < metricArity; i++) {
      const v = Number(row.metricValues?.[i]?.value ?? "0");
      acc[i] += Number.isFinite(v) ? v : 0;
    }

    out.set(ref, acc);
  }

  return out;
}
