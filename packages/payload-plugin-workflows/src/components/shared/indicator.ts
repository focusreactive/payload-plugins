// What the document's workflow indicator says, as a pure function of the state the server sent.
// No React, no Payload imports, so it is unit-tested directly.

import type { WorkflowState } from "../../server/queries.js";
import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";

/**
 * The run's state from the reader's side: it waits on them, a guard holds the document, it waits
 * on someone else, anyone may act, or it is stuck.
 */
export type IndicatorTone = "you" | "held" | "others" | "anyone" | "stuck";

export type Indicator =
  /** No run on the document and nothing the reader may start: no indicator at all. */
  | { kind: "none" }
  /** Nothing running; something to start, or a finished run to look back at. */
  | { kind: "idle"; finished?: InstanceView }
  | { kind: "run"; view: InstanceView; tone: IndicatorTone; waitsOnMe: boolean; more: number };

/**
 * Whether the run waits on `me`: they are assigned, or it waits on a role pool and they may take
 * one of its actions (the server computed `allowed` with their roles).
 */
export const waitsOn = (view: InstanceView, me: string | undefined): boolean => {
  if (view.status !== "active" || view.stuck) {
    return false;
  }
  if (me !== undefined && view.waitingOn.users.includes(me)) {
    return true;
  }
  return (
    view.waitingOn.roles.length > 0 &&
    view.activities.some(
      (activity) =>
        activity.status === "active" &&
        !activity.assignee &&
        activity.actions.some((action) => action.allowed)
    )
  );
};

export const toneOf = (view: InstanceView, me: string | undefined): IndicatorTone => {
  if (view.stuck) {
    return "stuck";
  }
  if (waitsOn(view, me)) {
    return "you";
  }
  if (view.guards.length > 0) {
    return "held";
  }
  return view.waitingOn.users.length > 0 || view.waitingOn.roles.length > 0 ? "others" : "anyone";
};

/**
 * The runs the indicator and the drawer show: the active ones, the one waiting on `me` first, and
 * the latest finished run (`instances` is newest first).
 */
export const runsOf = (
  state: WorkflowState,
  me: string | undefined
): { active: InstanceView[]; finished?: InstanceView } => {
  const active = state.instances.filter((view) => view.status === "active");
  const first = active.find((view) => waitsOn(view, me));
  const finished = state.instances.find((view) => view.status !== "active");
  return {
    active: first ? [first, ...active.filter((view) => view !== first)] : active,
    ...(finished ? { finished } : {}),
  };
};

/** What the indicator names: the first active run, else a finished one or something to start. */
export const indicatorOf = (state: WorkflowState, me: string | undefined): Indicator => {
  const { active, finished } = runsOf(state, me);
  const named = active[0];
  if (named) {
    const waitsOnMe = waitsOn(named, me);
    return {
      kind: "run",
      view: named,
      tone: toneOf(named, me),
      waitsOnMe,
      more: active.length - 1,
    };
  }
  if (!finished && state.available.length === 0) {
    return { kind: "none" };
  }
  return finished ? { kind: "idle", finished } : { kind: "idle" };
};

/**
 * Whose turn it is, from the reader's side: the one line the drawer leads with. `you` carries the
 * roles when the reader acts as a member of a role pool rather than by name.
 */
export type Turn =
  | { kind: "stuck" }
  | { kind: "completed" }
  | { kind: "aborted" }
  | { kind: "you"; roles: string[] }
  | { kind: "anyone" }
  | { kind: "others"; users: string[]; roles: string[] }
  | { kind: "nobody" };

export const turnOf = (view: InstanceView, me: string | undefined): Turn => {
  if (view.stuck) {
    return { kind: "stuck" };
  }
  if (view.status !== "active") {
    return { kind: view.status };
  }
  if (waitsOn(view, me)) {
    const named = me !== undefined && view.waitingOn.users.includes(me);
    return { kind: "you", roles: named ? [] : [...view.waitingOn.roles] };
  }
  const { users, roles } = view.waitingOn;
  if (users.length > 0 || roles.length > 0) {
    return { kind: "others", users: [...users], roles: [...roles] };
  }
  const canAct = view.activities.some(
    (activity) => activity.status === "active" && activity.actions.some((action) => action.allowed)
  );
  return { kind: canAct ? "anyone" : "nobody" };
};

/**
 * The actions an activity shows the reader. None while it is not active, or when the reader may
 * take none of them (the turn line already says who may). Otherwise the allowed ones, plus those
 * refused for a reason the reader can act on (roles); an action its own `filter` turned off (e.g.
 * "Take this review" once taken) is simply not there.
 */
export const shownActions = (activity: ViewActivity): ViewAction[] => {
  if (activity.status !== "active" || !activity.actions.some((action) => action.allowed)) {
    return [];
  }
  return activity.actions.filter((action) => action.allowed || action.reasonCode === "roles");
};

/** The first action the reader may take: the one primary button, `activity/action`. */
export const primaryActionOf = (view: InstanceView): string | undefined =>
  view.activities
    .flatMap((activity) =>
      shownActions(activity)
        .filter((action) => action.allowed)
        .map((action) => `${activity.name}/${action.name}`)
    )
    .at(0);
