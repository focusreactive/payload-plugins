import { definitionVersionOf } from "../define.js";
import type {
  Caller,
  CallerActionDef,
  Env,
  InstanceState,
  InstanceView,
  Label,
  StageState,
  ViewAction,
  WorkflowDefinition,
  WorkflowEvent,
} from "../types.js";
import { labelText } from "../vocabulary.js";
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
const titlesOf = (
  def: WorkflowDefinition,
  text: (label: Label | undefined) => string | undefined
): Record<string, string> => {
  const titles: Record<string, string> = {};
  const add = (key: string, title: Label | undefined) => {
    const value = text(title);
    if (value) {
      titles[key] = value;
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

/** History entries a view carries: the most recent ones; older ones are read on demand. */
export const HISTORY_IN_VIEW = 50;

/** What a view shows besides the run: its most recent events, and the reader's language. */
export interface ViewInput {
  /** The run's most recent events, oldest first (the server reads `HISTORY_IN_VIEW` of them). */
  events: WorkflowEvent[];
  /** The admin language titles are resolved for (per-language titles); default English. */
  language?: string;
}

/**
 * The projection every surface renders: what is going on and what this caller may do. Without
 * `input` it carries no history.
 */
export const view = (
  def: WorkflowDefinition,
  state: InstanceState,
  caller: Caller,
  env: Env,
  { events, language }: ViewInput = { events: [] }
): InstanceView => {
  const text = (label: Label | undefined) => labelText(label, language);
  const stage = findStage(def, state.stage);
  const history = events.slice(-HISTORY_IN_VIEW);
  const first = history[0];
  return {
    workflow: def.name,
    title: text(def.title) ?? def.name,
    status: state.status,
    ...(stage ? {} : { stuck: "unknown-stage" as const }),
    stage: {
      name: state.stage,
      title: text(stage?.title) ?? state.stage,
      ...(stage?.description ? { description: text(stage.description) } : {}),
    },
    stages: def.stages.map((entry) => {
      let position: StageState = "unvisited";
      if (entry.name === state.stage) {
        position = "current";
      } else if (state.visited.includes(entry.name)) {
        position = "visited";
      }
      return { name: entry.name, title: text(entry.title) ?? entry.name, state: position };
    }),
    activities: activitiesOf(stage).map((activity) => {
      const assignee = heldAssignee(state, activity);
      return {
        name: activity.name,
        title: text(activity.title) ?? activity.name,
        ...(activity.description ? { description: text(activity.description) } : {}),
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
              title: text(action.title) ?? action.name,
              ...(action.description ? { description: text(action.description) } : {}),
              allowed: verdict.allowed,
              ...(verdict.allowed
                ? {}
                : { reason: verdict.reason, reasonCode: verdict.reasonCode }),
              params: (callable.params ?? []).map(({ title, description, ...param }) => ({
                ...param,
                ...(title === undefined ? {} : { title: text(title) }),
                ...(description === undefined ? {} : { description: text(description) }),
              })),
            };
          }),
      };
    }),
    guards: holdingGuards(def, state, env).map((guard) => ({
      name: guard.name,
      title: text(guard.title) ?? guard.name,
      operations: [...guard.operations],
    })),
    waitingOn: waitingOnOf(def, state),
    fields: { ...state.fields },
    history,
    // Events are numbered 1, 2, … without gaps: everything before the first one shown is older.
    olderHistory: first ? first.seq - 1 : Math.max(0, state.nextSeq - 1),
    started: { at: state.startedAt, actor: state.startedBy },
    definitionVersion: state.definitionVersion,
    definitionChanged: state.definitionVersion !== definitionVersionOf(def),
    titles: titlesOf(def, text),
    canAbort: false,
    ...(def.requiredToPublish === true ? { requiredToPublish: true as const } : {}),
    ...(state.publishedAt ? { publishedAt: state.publishedAt } : {}),
  };
};
