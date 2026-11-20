import type {
  ActivityDef,
  ActivityStatus,
  ActionDef,
  Caller,
  CallerContext,
  ConditionContext,
  Env,
  InstanceState,
  StageDef,
  SystemActor,
  WorkflowDefinition,
} from "../types.js";
import { WorkflowError } from "./errors.js";

export const SYSTEM: SystemActor = { system: true };

export const findStage = (def: WorkflowDefinition, name: string): StageDef | undefined =>
  def.stages.find((stage) => stage.name === name);

export const activitiesOf = (stage: StageDef | undefined): ActivityDef[] => stage?.activities ?? [];

export const isTerminal = (stage: StageDef): boolean => (stage.transitions ?? []).length === 0;

export const isAuto = (action: ActionDef): boolean => typeof action.when === "function";

export const firedKey = (activity: string, action: string): string => `${activity}/${action}`;

/** An activity's status this visit; one added to the definition after the run entered is active. */
export const statusOf = (state: InstanceState, activity: string): ActivityStatus =>
  (Object.hasOwn(state.activities, activity) ? state.activities[activity]?.status : undefined) ??
  "active";

/**
 * What conditions see. Activities come from the current stage's definition, their statuses from
 * the state: one removed from code no longer counts, one added after stage entry counts as active.
 */
export const conditionContext = (
  state: InstanceState,
  env: Env,
  stage: StageDef | undefined
): ConditionContext => {
  const activities: Record<string, ActivityStatus> = {};
  for (const activity of activitiesOf(stage)) {
    activities[activity.name] = statusOf(state, activity.name);
  }
  const statuses = Object.values(activities);
  return {
    fields: { ...state.fields },
    activities,
    allActivitiesDone: statuses.every((status) => status === "done" || status === "skipped"),
    anyActivityFailed: statuses.includes("failed"),
    doc: env.doc,
    now: env.now,
    stage: state.stage,
  };
};

/** Whether the caller is assigned: a held assignee shadows the role pool; neither => everyone. */
export const isAssigned = (
  activity: ActivityDef,
  state: InstanceState,
  caller: Caller
): boolean => {
  const held = activity.assignee ? state.fields[activity.assignee] : undefined;
  if (typeof held === "string" && held) {
    return held === caller.actor.id;
  }
  if (activity.roles && activity.roles.length > 0) {
    return activity.roles.some((role) => caller.roles.includes(role));
  }
  return true;
};

export const callerContext = (
  state: InstanceState,
  env: Env,
  stage: StageDef | undefined,
  activity: ActivityDef,
  caller: Caller
): CallerContext => ({
  ...conditionContext(state, env, stage),
  actor: caller.actor,
  roles: [...caller.roles],
  assigned: isAssigned(activity, state, caller),
});

/** Runs a definition callback; a throw becomes a `condition-error` naming where it came from. */
export const evaluate = <T, C>(label: string, fn: (ctx: C) => T, ctx: C): T => {
  try {
    return fn(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new WorkflowError("condition-error", `${label} threw: ${message}`);
  }
};
