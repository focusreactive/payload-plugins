import type { CollectionSlug } from "payload";

import { isCancelled, latestLogByLocale } from "./normalizeJob.js";
import type { PayloadJob } from "./types.js";

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
 * `append` and `queue` are independent: a request can both extend a live job and need a job of its
 * own, when a locale it asks for has already been translated by that job.
 */
export type EnqueuePlan = {
  host: PayloadJob | null;
  append: string[];
  queue: string[];
};

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
  if (!host) return { host: null, append: [], queue: requested };

  // Already-succeeded locales need a fresh job: the workflow passes the locale as the task id, so
  // Payload's restoration would skip them (see the workflow handler in PayloadJobsRunnerProvider).
  const settled = latestLogByLocale(host);
  const done = requested.filter((locale) => settled.get(locale)?.state === "succeeded");
  const listed = new Set(host.input?.target_lngs);
  const missing = requested.filter((locale) => !listed.has(locale));

  if (args.exclusiveQueue && host.processing) {
    return { host: null, append: [], queue: [...missing, ...done] };
  }
  return { host, append: missing, queue: done };
}

/**
 * A job carries one source locale, strategy, publish flag and requester for all of its locales, so it
 * can host only a request matching all four — the invariant is per document *per requester*.
 */
function pickHost(live: PayloadJob[], request: RequestShape): PayloadJob | null {
  const usable = live.filter(
    (job) =>
      Array.isArray(job.input?.target_lngs) &&
      !isCancelled(job.error) &&
      job.input?.source_lng === request.sourceLng &&
      job.input?.strategy === request.strategy &&
      (job.input?.publish_on_translation ?? false) === request.publishOnTranslation &&
      (job.input?.requester_id ?? null) === request.requesterId &&
      (job.input?.requester_collection ?? null) === request.requesterCollection
  );
  const newestFirst = usable.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return newestFirst[0] ?? null;
}
