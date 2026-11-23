import { describe, expect, it } from "vitest";

import { activeRunsFor, indicatorOf, toneOf, waitsOn } from "../src/components/shared/indicator.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import type { WorkflowState } from "../src/server/queries.js";
import type { InstanceView } from "../src/types.js";
import { editor, editorialReview } from "./fixtures.js";

const available = [{ name: "editorial-review", title: "Editorial review" }];

const inReview = (claimedBy?: string) => {
  const sim = createWorkflowSimulator(editorialReview);
  sim.fire("write", "submit", { user: "u-author" });
  if (claimedBy) {
    sim.fire("review", "claim", { user: claimedBy, roles: ["editor"] });
  }
  return sim;
};

const withId = (view: InstanceView, id: string): InstanceView => ({ ...view, id });

describe("indicatorOf", () => {
  it("says nothing without a run or anything to start, and a neutral button with something to start", () => {
    expect(indicatorOf({ instances: [], available: [] }, "u1")).toEqual({ kind: "none" });
    expect(indicatorOf({ instances: [], available }, "u1")).toEqual({ kind: "idle" });
  });

  it("keeps a finished run reachable, even with nothing to start", () => {
    const sim = inReview(editor.user);
    sim.fire("review", "approve", editor);
    const finished = sim.view(editor);
    expect(finished.status).toBe("completed");
    expect(indicatorOf({ instances: [finished], available: [] }, editor.user)).toEqual({
      kind: "idle",
      finished,
    });
  });

  it("drafting waits on anyone: neutral", () => {
    const sim = createWorkflowSimulator(editorialReview);
    const state: WorkflowState = { instances: [sim.view({ user: "u1" })], available: [] };
    expect(indicatorOf(state, "u1")).toMatchObject({
      kind: "run",
      tone: "anyone",
      waitsOnMe: false,
      more: 0,
    });
  });

  it("review waits on the reviewer; someone else sees the guard holding publish", () => {
    const sim = inReview(editor.user);
    expect(toneOf(sim.view(editor), editor.user)).toBe("you");
    const other = sim.view({ user: "u-author" });
    expect(waitsOn(other, "u-author")).toBe(false);
    expect(toneOf(other, "u-author")).toBe("held");
  });

  it("a role pool waits on a member who may act, not on someone outside it", () => {
    const sim = inReview();
    expect(toneOf(sim.view(editor), editor.user)).toBe("you");
    expect(toneOf(sim.view({ user: "u-author", roles: [] }), "u-author")).toBe("held");
  });

  it("waiting on someone else with no guard is neutral", () => {
    const view = {
      ...createWorkflowSimulator(editorialReview).view(),
      waitingOn: { users: ["u2"], roles: [] },
    };
    expect(toneOf(view, "u1")).toBe("others");
  });

  it("a stuck run is a problem", () => {
    const view: InstanceView = { ...inReview().view(editor), stuck: "unknown-stage" };
    expect(toneOf(view, editor.user)).toBe("stuck");
  });

  it("names the run waiting on the reader first, and counts the others", () => {
    const drafting = withId(createWorkflowSimulator(editorialReview).view(editor), "a");
    const review = withId(inReview(editor.user).view(editor), "b");
    const state: WorkflowState = { instances: [drafting, review], available: [] };
    expect(indicatorOf(state, editor.user)).toMatchObject({ kind: "run", view: review, more: 1 });
    expect(activeRunsFor(state, editor.user)).toEqual([review, drafting]);
    expect(indicatorOf(state, "u-nobody")).toMatchObject({ view: drafting, more: 1 });
  });
});
