import type { PayloadJob } from "./types.js";

/**
 * Which requested locales the live run will translate without being touched.
 *
 * A failed attempt still counts as covered — the run comes back to it. A locale it has translated
 * does not: Payload will not re-run a task id under the same run.
 *
 * The caller guarantees the run is one this request may join and that its locale list is present.
 */
export type AlreadyCovered = (run: PayloadJob, requested: string[]) => string[];

export const alreadyCovered: AlreadyCovered = (run, requested) => {
  const listed = new Set(run.input?.target_lngs);
  const translated = new Set(
    (run.log ?? [])
      .filter((entry) => entry.state === "succeeded")
      .map((entry) => entry.input?.target_lng)
  );
  return [...new Set(requested)].filter((locale) => listed.has(locale) && !translated.has(locale));
};
