import type { PayloadJob, StoredRunTarget } from "../store/index.js";
import { covers } from "./covers.js";
import { runTargets } from "../store/runTargets.js";

/**
 * Which requested locales the live run will translate without being touched; the caller guarantees
 * the run is one this request may join.
 *
 * A failed attempt still counts as covered — the run comes back to it. A locale it has already
 * translated does not: Payload will not re-run a task id under the same run.
 */
export type AlreadyCovered = (run: PayloadJob, requested: StoredRunTarget[]) => string[];

export const alreadyCovered: AlreadyCovered = (run, requested) => {
  const listed = new Map(runTargets(run.input).map((target) => [target.lng, target]));
  const translated = new Set(
    (run.log ?? [])
      .filter((entry) => entry.state === "succeeded")
      .map((entry) => entry.input?.target_lng)
  );
  const asked = new Map(requested.map((ask) => [ask.lng, ask]));
  return [...asked.values()]
    .filter((ask) => {
      const entry = listed.get(ask.lng);
      return entry !== undefined && !translated.has(ask.lng) && covers(entry.filters, ask.filters);
    })
    .map((ask) => ask.lng);
};
