import type { LocaleCode } from "../../../types/wire/primitives.js";
import type { RunState } from "../../../types/wire/RunState.js";
import { toClientErrorMessage } from "../../shared/http/index.js";

import { lastTouched } from "./runStatus.js";
import type { ReportedRun } from "./runStatus.js";

const isNewer = (candidate: ReportedRun, current: ReportedRun): boolean =>
  candidate.row.queuedAt !== current.row.queuedAt
    ? candidate.row.queuedAt > current.row.queuedAt
    : lastTouched(candidate.row) > lastTouched(current.row);

export function latestPerTargetLocale(runs: readonly ReportedRun[]): ReportedRun[] {
  const byLocale = new Map<string, ReportedRun>();
  for (const run of runs) {
    const current = byLocale.get(run.row.targetLng);
    if (!current || isNewer(run, current)) byLocale.set(run.row.targetLng, run);
  }
  return [...byLocale.values()];
}

function inProjectOrder(
  locales: Iterable<string>,
  configured: readonly LocaleCode[]
): LocaleCode[] {
  const covered = new Set(locales);
  const known = configured.filter((locale) => covered.has(locale));
  const rest = [...covered].filter((locale) => !configured.includes(locale)).sort();
  return [...known, ...rest];
}

function firstToFail(siblings: readonly ReportedRun[]): ReportedRun | undefined {
  const failed = siblings.filter((run) => run.status === "failed");
  return failed.sort((left, right) => {
    const settled = lastTouched(left.row).localeCompare(lastTouched(right.row));
    return settled === 0 ? left.row.targetLng.localeCompare(right.row.targetLng) : settled;
  })[0];
}

const failureOf = (run: ReportedRun): { message: string } => ({
  message: toClientErrorMessage(run.row.error ?? undefined),
});

export type RunStateQuestion = {
  runs: readonly ReportedRun[];
  locale: LocaleCode;
  configuredLocales: readonly LocaleCode[];
};

/**
 * The run handle never crosses the wire: a locale carries the whole run's locales instead, because
 * cancel and retry act on the run, not on the locale.
 */
export function runStateOf({ runs, locale, configuredLocales }: RunStateQuestion): RunState | null {
  const mine = latestPerTargetLocale(runs).find((run) => run.row.targetLng === locale);
  if (!mine || mine.status === "completed") return null;

  const siblings = runs.filter((run) => run.row.handle === mine.row.handle);
  const covers = {
    locales: inProjectOrder(
      siblings.map((run) => run.row.targetLng),
      configuredLocales
    ),
    queuedAt: mine.row.queuedAt,
  };

  if (mine.status === "pending") return { status: "queued", ...covers };
  if (mine.status === "running") return { status: "running", ...covers };
  if (mine.status === "failed") return { status: "failed", ...covers, ...failureOf(mine) };

  const blamed = firstToFail(siblings);
  if (!blamed) return { status: "failed", ...covers, ...failureOf(mine) };
  return { status: "not-started", ...covers, failedLocale: blamed.row.targetLng };
}
