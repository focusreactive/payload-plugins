import type { CollectionSlug } from "payload";

import { alreadyCovered } from "./alreadyCovered.js";
import { isCancelled } from "../store/index.js";
import type { PayloadJob } from "../store/index.js";

export type RequestShape = {
  collectionSlug: CollectionSlug;
  collectionId: string;
  sourceLng: string;
  strategy: string;
  publishOnTranslation: boolean;
  requesterId: string | number | null;
  requesterCollection: string | null;
};

/**
 * What to do about each locale a request asked for. **Every requested locale appears in exactly one
 * of `append`, `queue` and `covered`** — one in none of them is work the caller cannot report.
 *
 * `queue` is for a locale the live run has already translated: it will not translate it again.
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
 * A job carries one source locale, strategy, publish flag and requester for all of its locales, so it
 * can host only a request matching all four — the invariant is per document *per requester*.
 */
function pickHost(live: PayloadJob[], request: RequestShape): PayloadJob | null {
  const usable = live.filter(
    (job) =>
      Array.isArray(job.input?.target_lngs) &&
      !isCancelled(job.error) &&
      job.hasError !== true &&
      job.input?.source_lng === request.sourceLng &&
      job.input?.strategy === request.strategy &&
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
  requested: string[];
  exclusiveQueue: boolean;
}): EnqueuePlan {
  const requested = [...new Set(args.requested)];
  const host = pickHost(args.live, args.request);
  if (!host) return { host: null, append: [], queue: requested, covered: [], coveredBy: null };

  const listed = new Set(host.input?.target_lngs);
  const missing = requested.filter((locale) => !listed.has(locale));
  const covered = alreadyCovered(host, requested);
  const alreadyTranslated = requested.filter(
    (locale) => listed.has(locale) && !covered.includes(locale)
  );

  if (args.exclusiveQueue && host.processing) {
    return {
      host: null,
      append: [],
      queue: [...missing, ...alreadyTranslated],
      covered,
      coveredBy: host,
    };
  }
  return {
    host,
    append: missing,
    queue: alreadyTranslated,
    covered,
    coveredBy: covered.length ? host : null,
  };
}
