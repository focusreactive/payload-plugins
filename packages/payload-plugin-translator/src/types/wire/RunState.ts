import type { IsoDateTime, LocaleCode } from "./primitives.js";

type RunOf<Status extends string> = {
  status: Status;
  /** Every locale the run covers. Cancel and retry act on the run, so on all of these at once. */
  locales: readonly LocaleCode[];
  queuedAt: IsoDateTime;
};

/**
 * The run that last touched a locale, while it still needs attention. A locale whose last run
 * succeeded carries no run at all.
 */
export type RunState =
  | RunOf<"queued">
  | RunOf<"running">
  | (RunOf<"failed"> & { message: string })
  | (RunOf<"not-started"> & { failedLocale: LocaleCode });

export type RunStatus = RunState["status"];
