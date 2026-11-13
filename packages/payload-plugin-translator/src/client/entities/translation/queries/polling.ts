import type { RunState } from "../../../../types/wire/RunState.js";

export const POLL_INTERVAL_MS = 20_000;

/** What `refetchInterval` takes: milliseconds, or `false` to stop. */
export type PollInterval = number | false;

type RunCarrier = { run: RunState | null };

const isLive = (run: RunState | null): boolean =>
  run?.status === "queued" || run?.status === "running";

/** Polls while any locale has a run in flight; a failed or not-started run waits for the user. */
export function pollWhileRunning(locales: readonly RunCarrier[]): PollInterval {
  return locales.some(({ run }) => isLive(run)) ? POLL_INTERVAL_MS : false;
}
