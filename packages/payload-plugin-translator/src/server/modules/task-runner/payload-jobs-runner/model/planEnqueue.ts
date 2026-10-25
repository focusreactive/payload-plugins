import type { CollectionSlug } from "payload";

import { alreadyCovered } from "./alreadyCovered.js";
import { isCancelled, runLocales } from "../store/index.js";
import type { PayloadJob, StoredRunTarget } from "../store/index.js";

export type RequestShape = {
  collectionSlug: CollectionSlug;
  collectionId: string;
  sourceLng: string;
  publishOnTranslation: boolean;
  requesterId: string | number | null;
  requesterCollection: string | null;
};

/**
 * What to do about each locale a request asked for. **Every requested locale appears in exactly one
 * of `append`, `queue` and `covered`** — one in none of them is work the caller cannot report.
 *
 * `queue` is for a locale the live run cannot serve: one it has already translated, or one it
 * lists while meaning to translate less than this request asks for.
 * `covered` needs nothing done, and `coveredBy` names the run doing it — kept apart from `host`,
 * which is null when the run may not be written to although it is still translating.
 */
export type EnqueuePlan = {
  host: PayloadJob | null;
  append: string[];
  queue: string[];
  covered: string[];
  coveredBy: PayloadJob | null;
};

/**
 * A job carries one source locale, publish flag and requester for all of its locales, so it can host
 * only a request matching those — the invariant is per document *per requester*. Filters are stored
 * per locale, so they do not bar hosting.
 */
function pickHost(live: PayloadJob[], request: RequestShape): PayloadJob | null {
  const usable = live.filter(
    (job) =>
      runLocales(job.input).length > 0 &&
      !isCancelled(job.error) &&
      job.hasError !== true &&
      job.input?.source_lng === request.sourceLng &&
      (job.input?.publish_on_translation ?? false) === request.publishOnTranslation &&
      (job.input?.requester_id ?? null) === request.requesterId &&
      (job.input?.requester_collection ?? null) === request.requesterCollection
  );
  const newestFirst = usable.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return newestFirst[0] ?? null;
}

/**
 * One live job per document: a later request extends that job's locale list rather than replacing it.
 *
 * @param live - non-completed jobs for **this document only**; the caller filters by document.
 * @param exclusiveQueue - the host's `enableConcurrencyControl`; with it on, a running job is queued
 *   behind rather than extended.
 */
export function planEnqueue(args: {
  live: PayloadJob[];
  request: RequestShape;
  requested: StoredRunTarget[];
  exclusiveQueue: boolean;
}): EnqueuePlan {
  const asked = new Map(args.requested.map((target) => [target.lng, target]));
  const requested = [...asked.keys()];
  const host = pickHost(args.live, args.request);
  if (!host) return { host: null, append: [], queue: requested, covered: [], coveredBy: null };

  const listed = new Set(runLocales(host.input));
  const missing = requested.filter((locale) => !listed.has(locale));
  const covered = alreadyCovered(host, [...asked.values()]);
  const needsItsOwnRun = requested.filter(
    (locale) => listed.has(locale) && !covered.includes(locale)
  );

  if (args.exclusiveQueue && host.processing) {
    return {
      host: null,
      append: [],
      queue: [...missing, ...needsItsOwnRun],
      covered,
      coveredBy: host,
    };
  }
  return {
    host,
    append: missing,
    queue: needsItsOwnRun,
    covered,
    coveredBy: covered.length ? host : null,
  };
}
