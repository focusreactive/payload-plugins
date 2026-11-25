// What the document's workflow indicator says, as a pure function of the state the server sent.
// No React, no Payload imports, so it is unit-tested directly.

import type { WorkflowState } from "../../server/queries.js";
import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";

/**
 * One status language for runs, wherever they show (indicator, drawer, list, board): it waits on
 * the reader (`attention`), it is under way or waits on others (`neutral`), it completed
 * (`success`), it was stopped (`muted`), it is stuck (`error`).
 */
export type RunTone = "attention" | "neutral" | "success" | "muted" | "error";

/** Each tone as Payload's `Pill` style. */
export const PILL_STYLE: Record<RunTone, "warning" | "light" | "success" | "light-gray" | "error"> =
  {
    attention: "warning",
    neutral: "light",
    success: "success",
    muted: "light-gray",
    error: "error",
  };

export type Indicator =
  /** No run on the document and nothing the reader may start: no indicator at all. */
  | { kind: "none" }
  /** Nothing running; something to start, or a finished run to look back at. */
  | { kind: "idle"; finished?: InstanceView; tone: RunTone }
  | { kind: "run"; view: InstanceView; tone: RunTone; waitsOnMe: boolean; more: number };

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

/** A run's tone for the reader. */
export const toneOf = (view: InstanceView, me: string | undefined): RunTone => {
  if (view.stuck) {
    return "error";
  }
  if (view.status === "completed") {
    return "success";
  }
  if (view.status === "aborted") {
    return "muted";
  }
  return waitsOn(view, me) ? "attention" : "neutral";
};

/** The same tone for a row of the workflows view, from what the list reports. */
export const summaryToneOf = (run: {
  status: InstanceView["status"];
  stuck?: string;
  waitsOnYou: boolean;
}): RunTone => {
  if (run.stuck) {
    return "error";
  }
  if (run.status === "completed") {
    return "success";
  }
  if (run.status === "aborted") {
    return "muted";
  }
  return run.waitsOnYou ? "attention" : "neutral";
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
  // A completed run shows as completed; a stopped one, or none, as a plain "Workflow".
  return finished?.status === "completed"
    ? { kind: "idle", finished, tone: "success" }
    : { kind: "idle", ...(finished ? { finished } : {}), tone: "neutral" };
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
  /** Open to anyone, but not to the reader (an action's `filter`, e.g. not their own work). */
  | { kind: "othersOpen" }
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
  const open = view.activities.filter((activity) => activity.status === "active");
  if (open.some((activity) => activity.actions.some((action) => action.allowed))) {
    return { kind: "anyone" };
  }
  // People can act here, just not the reader; with no caller actions the engine moves on its own.
  return { kind: open.some((activity) => activity.actions.length > 0) ? "othersOpen" : "nobody" };
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

/**
 * The state after an operation, from its answer alone when that answer is all that changed: a run
 * that is still active after a fire (same run, nothing to start or stop), or a run just started
 * (it leads the list; its workflow is no longer startable). `null`: refetch.
 */
export const stateAfter = (
  state: WorkflowState | null,
  kind: "start" | "fire" | "abort",
  answer: InstanceView | undefined
): WorkflowState | null => {
  if (!state || !answer?.id || answer.status !== "active") {
    return null;
  }
  if (kind === "fire" && state.instances.some((entry) => entry.id === answer.id)) {
    return {
      ...state,
      instances: state.instances.map((entry) => (entry.id === answer.id ? answer : entry)),
    };
  }
  if (kind === "start") {
    return {
      ...state,
      instances: [answer, ...state.instances],
      available: state.available.filter((entry) => entry.name !== answer.workflow),
    };
  }
  return null;
};
