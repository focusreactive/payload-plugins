import { dim } from "../../rows";
import type { Ga4Row } from "../../rows";

export function aggregateDailyByBucket(rows: Ga4Row[]): Record<string, Record<string, number>> {
  const map = new Map<string, Map<string, Set<string>>>();

  for (const r of rows) {
    const date = dim(r, 0);
    const bucket = dim(r, 1);
    const sid = dim(r, 2);

    if (!bucket || !date || !sid) continue;

    const perBucket = map.get(bucket) ?? map.set(bucket, new Map()).get(bucket)!;
    (perBucket.get(date) ?? perBucket.set(date, new Set()).get(date)!).add(sid);
  }

  const out: Record<string, Record<string, number>> = {};
  for (const [b, perDate] of map) {
    out[b] = {};
    for (const [d, set] of perDate) out[b]![d] = set.size;
  }

  return out;
}
