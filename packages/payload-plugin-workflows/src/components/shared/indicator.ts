// What the document's workflow indicator says, as a pure function of the state the server sent.
// No React, no Payload imports, so it is unit-tested directly.

import type { WorkflowState } from "../../server/queries.js";
import type { InstanceView } from "../../types.js";

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

/** The one run the indicator names: the first that waits on `me`, else the first active one. */
export const indicatorOf = (state: WorkflowState, me: string | undefined): Indicator => {
  const active = state.instances.filter((view) => view.status === "active");
  const named = active.find((view) => waitsOn(view, me)) ?? active[0];
  if (named) {
    return {
      kind: "run",
      view: named,
      tone: toneOf(named, me),
      waitsOnMe: waitsOn(named, me),
      more: active.length - 1,
    };
  }
  // `instances` is newest first, so the first finished one is the latest.
  const finished = state.instances.find((view) => view.status !== "active");
  if (!finished && state.available.length === 0) {
    return { kind: "none" };
  }
  return finished ? { kind: "idle", finished } : { kind: "idle" };
};

/** Active runs with the one the indicator names first, so the drawer opens on it. */
export const activeRunsFor = (state: WorkflowState, me: string | undefined): InstanceView[] => {
  const active = state.instances.filter((view) => view.status === "active");
  const first = active.find((view) => waitsOn(view, me));
  return first ? [first, ...active.filter((view) => view !== first)] : active;
};
