import type { Env, GuardDef, InstanceState, WorkflowDefinition } from "../types.js";
import { conditionContext, findStage } from "./context.js";

/**
 * Guards of the current stage that hold right now. An `unless` that throws keeps its guard
 * holding: when in doubt, the gate stays shut.
 */
export const holdingGuards = (
  def: WorkflowDefinition,
  state: InstanceState,
  env: Env
): GuardDef[] => {
  if (state.status !== "active") {
    return [];
  }
  const stage = findStage(def, state.stage);
  const guards = stage?.guards ?? [];
  if (guards.length === 0) {
    return [];
  }
  const ctx = conditionContext(state, env, stage);
  return guards.filter((guard) => {
    if (!guard.unless) {
      return true;
    }
    try {
      return !guard.unless(ctx);
    } catch {
      return true;
    }
  });
};
