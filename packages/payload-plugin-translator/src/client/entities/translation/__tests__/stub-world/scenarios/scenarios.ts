import type { ContentState } from "../../../../../../types/wire/DocumentTranslationState.js";
import type { IsoDateTime, LocaleCode } from "../../../../../../types/wire/primitives.js";
import type { DocumentRef, DocumentSeed, SeededRun, WorldRules } from "../model/index.js";

import { FIXTURE_DOCUMENT, currentVerdicts, driftedVerdicts } from "./fixtureDocument.js";
import { stableHash } from "./stableHash.js";

export type ScenarioName =
  | "mixed"
  | "empty"
  | "failing"
  | "slow"
  | "abilities-limited"
  | "provenance-off";

export type StubScenario = WorldRules & {
  latencyMs: number;
  /** Off: cancel, cancel-by-collection and run are not registered, as on a runner that cannot stop or run. */
  servesCancelAndRunNow: boolean;
};

type ContentSeed = "current" | "drifted" | "empty" | "untracked" | "filled";
type RunSeed = SeededRun["status"] | null;

const SEEDED_AT: IsoDateTime = "2026-11-01T09:00:00.000Z";

function contentOf(seed: ContentSeed): ContentState {
  if (seed === "current") {
    return { kind: "tracked", verdicts: currentVerdicts(), translatedAt: SEEDED_AT };
  }
  if (seed === "drifted") {
    return { kind: "tracked", verdicts: driftedVerdicts(), translatedAt: SEEDED_AT };
  }
  return { kind: seed };
}

/** Spread over documents, so one list page shows many states; each locale of a document differs too. */
const spread =
  (contents: readonly ContentSeed[], runs: readonly RunSeed[]) =>
  (document: DocumentRef, targets: readonly LocaleCode[]): DocumentSeed => {
    const hash = stableHash(`${document.collection}:${document.id}`);
    const run = runs[hash % runs.length];
    return {
      contents: Object.fromEntries(
        targets.map((locale, index) => [
          locale,
          contentOf(contents[(hash + index) % contents.length]),
        ])
      ),
      run: run === null ? null : { status: run, locales: targets },
    };
  };

const EVERY_CONTENT: readonly ContentSeed[] = [
  "current",
  "drifted",
  "empty",
  "untracked",
  "filled",
];
const SOME_RUNS: readonly RunSeed[] = [null, null, null, "queued", "running", "failed"];

const MIXED: StubScenario = {
  fixture: FIXTURE_DOCUMENT,
  seed: spread(EVERY_CONTENT, SOME_RUNS),
  runsFail: false,
  keepsRecords: true,
  latencyMs: 0,
  servesCancelAndRunNow: true,
};

export const SCENARIOS: Readonly<Record<ScenarioName, StubScenario>> = {
  mixed: MIXED,
  empty: { ...MIXED, seed: spread(["empty"], [null]) },
  failing: { ...MIXED, runsFail: true },
  slow: { ...MIXED, latencyMs: 3000 },
  "abilities-limited": { ...MIXED, servesCancelAndRunNow: false },
  "provenance-off": { ...MIXED, seed: spread(["empty", "filled"], SOME_RUNS), keepsRecords: false },
};

export function isScenarioName(name: string): name is ScenarioName {
  return Object.hasOwn(SCENARIOS, name);
}
