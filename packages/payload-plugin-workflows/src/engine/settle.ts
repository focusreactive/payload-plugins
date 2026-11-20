import type {
  AutoActionDef,
  Env,
  InstanceState,
  QueuedEffect,
  Result,
  WorkflowDefinition,
} from "../types.js";
import {
  SYSTEM,
  activitiesOf,
  conditionContext,
  evaluate,
  findStage,
  firedKey,
  isAuto,
  statusOf,
} from "./context.js";
import { WorkflowError } from "./errors.js";
import { applyAction, enterStage } from "./steps.js";

/** Guards against definitions whose conditions bounce between stages forever. */
export const CASCADE_LIMIT = 50;

const fireAutoActions = (def: WorkflowDefinition, state: InstanceState, env: Env): Result => {
  let current = state;
  const effects: QueuedEffect[] = [];
  const stage = findStage(def, state.stage);
  for (const activity of activitiesOf(stage)) {
    for (const action of activity.actions) {
      if (!isAuto(action) || statusOf(current, activity.name) !== "active") {
        continue;
      }
      if (current.fired.includes(firedKey(activity.name, action.name))) {
        continue;
      }
      const auto = action as AutoActionDef;
      const label = `stage "${current.stage}" activity "${activity.name}" action "${action.name}"`;
      const ctx = conditionContext(current, env, stage);
      if (!evaluate(`${label} when`, auto.when, ctx)) {
        continue;
      }
      const patch =
        typeof auto.set === "function"
          ? evaluate(`${label} set`, auto.set, {
              ...ctx,
              actor: SYSTEM,
              roles: [],
              assigned: true,
              params: {},
            })
          : auto.set;
      const result = applyAction(
        def,
        current,
        { activity: activity.name, action, actor: SYSTEM, patch },
        env
      );
      current = result.state;
      effects.push(...result.effects);
    }
  }
  return { state: current, effects };
};

const takeTransition = (
  def: WorkflowDefinition,
  state: InstanceState,
  env: Env
): InstanceState | null => {
  const stage = findStage(def, state.stage);
  if (!stage) {
    return null;
  }
  const ctx = conditionContext(state, env, stage);
  for (const transition of stage.transitions ?? []) {
    const open = transition.when
      ? evaluate(`stage "${stage.name}" transition "${transition.name}" when`, transition.when, ctx)
      : ctx.allActivitiesDone;
    if (!open) {
      continue;
    }
    const target = findStage(def, transition.to);
    if (!target) {
      throw new WorkflowError(
        "unknown-stage",
        `Transition "${transition.name}" leads to undeclared stage "${transition.to}".`
      );
    }
    return enterStage(state, target, env, { transition: transition.name });
  }
  return null;
};

/**
 * The cascade: fire due auto actions, take the first open transition, repeat until nothing moves.
 * Returns the very same state object when nothing changed, so callers can skip the write.
 */
export const settle = (def: WorkflowDefinition, state: InstanceState, env: Env): Result => {
  if (state.status !== "active" || !findStage(def, state.stage)) {
    return { state, effects: [] };
  }
  let current = state;
  const effects: QueuedEffect[] = [];
  for (let round = 0; ; round += 1) {
    if (round >= CASCADE_LIMIT) {
      throw new WorkflowError(
        "cascade-limit",
        `Workflow "${def.name}" did not settle after ${CASCADE_LIMIT} steps; its conditions loop.`
      );
    }
    const fired = fireAutoActions(def, current, env);
    effects.push(...fired.effects);
    const moved = takeTransition(def, fired.state, env);
    const next = moved ?? fired.state;
    if (next === current) {
      return { state: current, effects };
    }
    current = next;
    if (current.status !== "active") {
      return { state: current, effects };
    }
  }
};
