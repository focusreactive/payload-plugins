import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type {
  BeforeTranslation,
  ChainMember,
  ModuleState,
} from "../../modules/translation-run/index.js";
import { runAfterSave, runBeforeTranslation } from "../../modules/translation-run/index.js";
import type { Run } from "./run.js";
import type { ApprovedSource } from "./targetDocument.js";

const moduleSeam = (run: Run): Pick<BeforeTranslation, "payload" | "target" | "scope"> => ({
  payload: run.payload,
  target: run.target,
  scope: run.scope,
});

export function runModulesBefore(args: {
  modules: readonly ChainMember[];
  run: Run;
  source: ApprovedSource;
  previousAttempts: number;
}) {
  const { modules, run, source, previousAttempts } = args;
  const opening = {
    ...moduleSeam(run),
    sourceData: source.sourceData,
    previousAttempts,
    moduleState: {},
  };
  return runBeforeTranslation(modules, opening, run.payload.logger);
}

export function runModulesAfter(args: {
  modules: readonly ChainMember[];
  run: Run;
  moduleState: ModuleState;
  leaves: readonly LeafOutcome[];
}) {
  const { modules, run, moduleState, leaves } = args;
  return runAfterSave(modules, { ...moduleSeam(run), moduleState, leaves }, run.payload.logger);
}
