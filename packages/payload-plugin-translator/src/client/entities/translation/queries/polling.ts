import type { RunState } from "../../../../types/wire/RunState.js";
import { hasLiveRun } from "../model/documentPanelStatus.js";

export const POLL_INTERVAL_MS = 20_000;

/** What `refetchInterval` takes: milliseconds, or `false` to stop. */
export type PollInterval = number | false;

type RunCarrier = { run: RunState | null };

/** Polls while any locale has a run in flight; a failed or not-started run waits for the user. */
export function pollWhileRunning(locales: readonly RunCarrier[]): PollInterval {
  return hasLiveRun(locales) ? POLL_INTERVAL_MS : false;
}
