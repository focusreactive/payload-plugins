import type { StoredInput } from "../store/index.js";
import { runTargets } from "../store/index.js";

export type LocaleRun = {
  target: string;
  input: Record<string, unknown>;
};

const inputSharedByEveryLocale = ({
  targets: _perLocale,
  target_lngs: _legacyLocales,
  strategy: _legacyStrategy,
  ...shared
}: StoredInput): Record<string, unknown> => shared;

/**
 * The run's locales, one at a time, **re-reading the list on every step**.
 *
 * A second request for the same document appends its locales to this row, and Payload copies the
 * freshly-read row onto the same `job` object after every task — so a locale added while the run is
 * in flight appears here. A list read once would drop it.
 *
 * A locale is yielded once. Nothing in the plugin writes it twice, but the list lives in a `json`
 * column, and a run that translated one locale twice would announce it to the host twice.
 *
 * @yields one locale of the run, with the input its task is handed
 */
export function* localesAsTheyStand(job: { input: StoredInput }): Generator<LocaleRun> {
  const walked = new Set<string>();
  for (let index = 0; ; index++) {
    const shared = inputSharedByEveryLocale(job.input);
    const entry = runTargets(job.input)[index];
    if (entry === undefined) return;
    if (walked.has(entry.lng)) continue;
    walked.add(entry.lng);
    yield {
      target: entry.lng,
      input: {
        ...shared,
        target_lng: entry.lng,
        filters: entry.filters,
      },
    };
  }
}
