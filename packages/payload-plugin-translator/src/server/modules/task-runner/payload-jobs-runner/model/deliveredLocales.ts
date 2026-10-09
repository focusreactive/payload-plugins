import { latestLogByLocale } from "../store/index.js";
import type { PayloadJob } from "../store/index.js";

/**
 * Which locales an **earlier** pass already delivered.
 *
 * Taken before anything in this pass runs: Payload writes a task's `succeeded` entry during the
 * call, so the same question asked mid-loop would count the locale this pass just finished.
 */
export function deliveredLocales(job: PayloadJob): Set<string> {
  const delivered = new Set<string>();
  for (const [locale, entry] of latestLogByLocale(job)) {
    if (entry.state === "succeeded") delivered.add(locale);
  }
  return delivered;
}
