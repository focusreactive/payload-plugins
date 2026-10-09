/** Only what this reads: the run's locale list, and the rest of the input each task is handed. */
type RunInput = { target_lngs?: string[] } & Record<string, unknown>;

export type LocaleRun = {
  target: string;
  input: Record<string, unknown>;
};

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
export function* localesAsTheyStand(job: { input: RunInput }): Generator<LocaleRun> {
  const walked = new Set<string>();
  for (let index = 0; ; index++) {
    const { target_lngs: targets, ...shared } = job.input;
    const target = targets?.[index];
    if (target === undefined) return;
    if (walked.has(target)) continue;
    walked.add(target);
    yield { target, input: { ...shared, target_lng: target } };
  }
}
