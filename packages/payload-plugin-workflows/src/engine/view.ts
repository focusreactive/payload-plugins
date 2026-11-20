import type {
  ActivityDef,
  Caller,
  CallerActionDef,
  Env,
  InstanceState,
  InstanceView,
  StageDef,
  ViewAction,
  ViewActionReason,
  ViewActivity,
  WorkflowDefinition,
} from "../types.js";
import { activitiesOf, findStage, isAuto, statusOf } from "./context.js";
import { holdingGuards } from "./guards.js";
import { verdictFor } from "./verdict.js";

const assigneeOf = (state: InstanceState, field: string | undefined): string | undefined => {
  const value = field ? state.fields[field] : undefined;
  return typeof value === "string" && value ? value : undefined;
};

const viewAction = (
  state: InstanceState,
  stage: StageDef | undefined,
  activity: ActivityDef,
  action: CallerActionDef,
  caller: Caller,
  env: Env
): ViewAction => {
  let verdict: { allowed: boolean; reason?: string; reasonCode?: ViewActionReason };
  try {
    verdict = verdictFor(state, stage, activity, action, caller, env);
  } catch (error) {
    // `fire` would fail with the same condition error; the button just stays disabled.
    verdict = { allowed: false, reason: (error as Error).message, reasonCode: "error" };
  }
  return {
    name: action.name,
    title: action.title ?? action.name,
    ...(action.description ? { description: action.description } : {}),
    allowed: verdict.allowed,
    ...(verdict.allowed ? {} : { reason: verdict.reason, reasonCode: verdict.reasonCode }),
    params: action.params ?? [],
  };
};

/** Who the run waits on: held assignees, else the role pools of the active activities. */
export const waitingOnOf = (
  def: WorkflowDefinition,
  state: InstanceState
): InstanceView["waitingOn"] => {
  const users = new Set<string>();
  const roles = new Set<string>();
  if (state.status !== "active") {
    return { users: [], roles: [] };
  }
  for (const activity of activitiesOf(findStage(def, state.stage))) {
    if (statusOf(state, activity.name) !== "active") {
      continue;
    }
    const assignee = assigneeOf(state, activity.assignee);
    if (assignee) {
      users.add(assignee);
    } else {
      for (const role of activity.roles ?? []) {
        roles.add(role);
      }
    }
  }
  return { users: [...users], roles: [...roles] };
};

/**
 * Titles of what the history names — stages, activities, actions and their params — keyed by
 * `stage`, `stage/activity`, `stage/activity/action` and `stage/activity/action/param`. Lets a
 * surface write "Ann chose “Request changes”" for entries of stages the run has left.
 */
export const historyTitles = (
  def: WorkflowDefinition,
  history: InstanceState["history"]
): Record<string, string> => {
  const titles: Record<string, string> = {};
  const stageTitle = (name: string) => {
    const stage = findStage(def, name);
    if (stage?.title) {
      titles[name] = stage.title;
    }
    return stage;
  };
  for (const entry of history) {
    if (entry.type === "started") {
      stageTitle(entry.stage);
    } else if (entry.type === "transition") {
      stageTitle(entry.from);
      stageTitle(entry.to);
    } else if (entry.type === "action") {
      const activity = activitiesOf(stageTitle(entry.stage)).find(
        (candidate) => candidate.name === entry.activity
      );
      const action = activity?.actions.find((candidate) => candidate.name === entry.action);
      const base = `${entry.stage}/${entry.activity}`;
      if (activity?.title) {
        titles[base] = activity.title;
      }
      if (action?.title) {
        titles[`${base}/${entry.action}`] = action.title;
      }
      for (const param of action?.params ?? []) {
        if (param.title) {
          titles[`${base}/${entry.action}/${param.name}`] = param.title;
        }
      }
    }
  }
  return titles;
};

/** The projection every surface renders: what is going on and what this caller may do. */
export const view = (
  def: WorkflowDefinition,
  state: InstanceState,
  caller: Caller,
  env: Env
): InstanceView => {
  const stage = findStage(def, state.stage);
  const currentIndex = def.stages.findIndex((entry) => entry.name === state.stage);
  const activities: ViewActivity[] = activitiesOf(stage).map((activity) => {
    const assignee = assigneeOf(state, activity.assignee);
    return {
      name: activity.name,
      title: activity.title ?? activity.name,
      ...(activity.description ? { description: activity.description } : {}),
      status: statusOf(state, activity.name),
      ...(assignee ? { assignee } : {}),
      ...(activity.roles ? { roles: [...activity.roles] } : {}),
      actions: activity.actions
        .filter((action) => !isAuto(action))
        .map((action) =>
          viewAction(state, stage, activity, action as CallerActionDef, caller, env)
        ),
    };
  });
  return {
    workflow: def.name,
    title: def.title ?? def.name,
    status: state.status,
    ...(stage ? {} : { stuck: "unknown-stage" as const }),
    stage: {
      name: state.stage,
      title: stage?.title ?? state.stage,
      ...(stage?.description ? { description: stage.description } : {}),
    },
    stages: def.stages.map((entry, index) => ({
      name: entry.name,
      title: entry.title ?? entry.name,
      state:
        index === currentIndex
          ? ("current" as const)
          : currentIndex >= 0 && index < currentIndex
            ? ("past" as const)
            : ("upcoming" as const),
    })),
    activities,
    guards: holdingGuards(def, state, env).map((guard) => ({
      name: guard.name,
      title: guard.title ?? guard.name,
      operations: [...guard.operations],
    })),
    waitingOn: waitingOnOf(def, state),
    fields: { ...state.fields },
    history: [...state.history],
    titles: historyTitles(def, state.history),
    canAbort: false,
  };
};
