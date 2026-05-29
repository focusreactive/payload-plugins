import { type Ga4Row, dim, metricInt } from "../../rows";

export function aggregateBucketConversions(rows: Ga4Row[]): {
  byBucket: Record<string, { convertingSessions: number; rawConversions: number }>;
  byBucketLead: Record<string, Record<string, number>>;
} {
  const convSessions = new Map<string, Set<string>>();
  const rawByBucket = new Map<string, number>();
  const leadSessions = new Map<string, Map<string, Set<string>>>();

  for (const r of rows) {
    const bucket = dim(r, 0);
    if (!bucket) continue;

    const sid = dim(r, 1);
    const leadType = dim(r, 2);
    const count = metricInt(r, 0);

    rawByBucket.set(bucket, (rawByBucket.get(bucket) ?? 0) + count);

    if (sid) {
      (convSessions.get(bucket) ?? convSessions.set(bucket, new Set()).get(bucket)!).add(sid);

      if (leadType) {
        const perLead = leadSessions.get(bucket) ?? leadSessions.set(bucket, new Map()).get(bucket)!;
        (perLead.get(leadType) ?? perLead.set(leadType, new Set()).get(leadType)!).add(sid);
      }
    }
  }
  const byBucket: Record<string, { convertingSessions: number; rawConversions: number }> = {};
  for (const b of new Set([...convSessions.keys(), ...rawByBucket.keys()])) {
    byBucket[b] = { convertingSessions: convSessions.get(b)?.size ?? 0, rawConversions: rawByBucket.get(b) ?? 0 };
  }

  const byBucketLead: Record<string, Record<string, number>> = {};
  for (const [b, perLead] of leadSessions) {
    byBucketLead[b] = {};
    for (const [lt, set] of perLead) byBucketLead[b]![lt] = set.size;
  }
  return { byBucket, byBucketLead };
}
