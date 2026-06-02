import { dim } from "../../rows";
import type { Ga4Row } from "../../rows";

export function aggregateBucketExposure(rows: Ga4Row[]): Record<string, { sessions: number; visitors: number }> {
  const sessions = new Map<string, Set<string>>();
  const visitors = new Map<string, Set<string>>();

  for (const r of rows) {
    const bucket = dim(r, 0);
    if (!bucket) continue;

    const sid = dim(r, 1);
    const vid = dim(r, 2);

    if (sid) (sessions.get(bucket) ?? sessions.set(bucket, new Set()).get(bucket)!).add(sid);
    if (vid) (visitors.get(bucket) ?? visitors.set(bucket, new Set()).get(bucket)!).add(vid);
  }

  const out: Record<string, { sessions: number; visitors: number }> = {};
  const buckets = new Set([...sessions.keys(), ...visitors.keys()]);

  for (const b of buckets) {
    out[b] = {
      sessions: sessions.get(b)?.size ?? 0,
      visitors: visitors.get(b)?.size ?? 0,
    };
  }

  return out;
}
