import type { JobLogEntry, PayloadJob } from "./types.js";

export function latestLogByLocale(job: PayloadJob): Map<string, JobLogEntry> {
  const byLocale = new Map<string, JobLogEntry>();
  for (const entry of job.log ?? []) {
    const lng = entry?.input?.target_lng;
    if (typeof lng === "string") byLocale.set(lng, entry);
  }
  return byLocale;
}
