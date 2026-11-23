import type {
  Caller,
  CallerActionDef,
  Env,
  InstanceState,
  InstanceView,
  ViewAction,
  WorkflowDefinition,
} from "../types.js";
import {
  activitiesOf,
  findStage,
  heldAssignee,
  holdingGuards,
  isAuto,
  statusOf,
  verdictFor,
} from "./engine.js";

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
    const assignee = heldAssignee(state, activity);
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

/** Every declared title, keyed by `stage`, `stage/activity`, `…/action` and `…/action/param`. */
const titlesOf = (def: WorkflowDefinition): Record<string, string> => {
  const titles: Record<string, string> = {};
  const add = (key: string, title: string | undefined) => {
    if (title) {
      titles[key] = title;
    }
  };
  for (const stage of def.stages) {
    add(stage.name, stage.title);
    for (const activity of activitiesOf(stage)) {
      const activityKey = `${stage.name}/${activity.name}`;
      add(activityKey, activity.title);
      for (const action of activity.actions) {
        add(`${activityKey}/${action.name}`, action.title);
        for (const param of action.params ?? []) {
          add(`${activityKey}/${action.name}/${param.name}`, param.title);
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
    stages: def.stages.map((entry, index) => {
      let position: "past" | "current" | "upcoming" = "upcoming";
      if (index === currentIndex) {
        position = "current";
      } else if (currentIndex >= 0 && index < currentIndex) {
        position = "past";
      }
      return { name: entry.name, title: entry.title ?? entry.name, state: position };
    }),
    activities: activitiesOf(stage).map((activity) => {
      const assignee = heldAssignee(state, activity);
      return {
        name: activity.name,
        title: activity.title ?? activity.name,
        ...(activity.description ? { description: activity.description } : {}),
        status: statusOf(state, activity.name),
        ...(assignee ? { assignee } : {}),
        ...(activity.roles ? { roles: [...activity.roles] } : {}),
        actions: activity.actions
          .filter((action) => !isAuto(action))
          .map((action): ViewAction => {
            const callable = action as CallerActionDef;
            let verdict: {
              allowed: boolean;
              reason?: string;
              reasonCode?: ViewAction["reasonCode"];
            };
            try {
              verdict = verdictFor(state, stage, activity, callable, caller, env);
            } catch (error) {
              // `fire` would fail with the same condition error; the button just stays disabled.
              verdict = { allowed: false, reason: (error as Error).message, reasonCode: "error" };
            }
            return {
              name: action.name,
              title: action.title ?? action.name,
              ...(action.description ? { description: action.description } : {}),
              allowed: verdict.allowed,
              ...(verdict.allowed
                ? {}
                : { reason: verdict.reason, reasonCode: verdict.reasonCode }),
              params: callable.params ?? [],
            };
          }),
      };
    }),
    guards: holdingGuards(def, state, env).map((guard) => ({
      name: guard.name,
      title: guard.title ?? guard.name,
      operations: [...guard.operations],
    })),
    waitingOn: waitingOnOf(def, state),
    fields: { ...state.fields },
    history: [...state.history],
    titles: titlesOf(def),
    canAbort: false,
  };
};
