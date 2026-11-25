import { describe, expect, it } from "vitest";

import {
  PILL_STYLE,
  indicatorOf,
  primaryActionOf,
  publishNoteOf,
  runsOf,
  shownActions,
  stateAfter,
  summaryToneOf,
  toneOf,
  turnOf,
  waitsOn,
} from "../src/components/shared/indicator.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import type { WorkflowState } from "../src/server/queries.js";
import type { InstanceView, WorkflowDefinition } from "../src/types.js";
import { author, editor, editorialReview } from "./fixtures.js";

const available = [{ name: "editorial-review", title: "Editorial review", stages: [] }];

const inReview = (claimedBy?: string) => {
  const sim = createWorkflowSimulator(editorialReview);
  sim.fire("submit", { user: "u-author" });
  if (claimedBy) {
    sim.fire("claim", { user: claimedBy, roles: ["editor"] });
  }
  return sim;
};

const withId = (view: InstanceView, id: string): InstanceView => ({ ...view, id });

describe("indicatorOf", () => {
  it("says nothing without a run or anything to start, and a neutral button with something to start", () => {
    expect(indicatorOf({ instances: [], available: [] }, "u1")).toEqual({ kind: "none" });
    expect(indicatorOf({ instances: [], available }, "u1")).toEqual({
      kind: "idle",
      tone: "neutral",
    });
  });

  it("keeps a finished run reachable: completed reads as success, stopped as neutral", () => {
    const sim = inReview(editor.user);
    sim.fire("approve", editor);
    const finished = sim.view(editor);
    expect(finished.status).toBe("completed");
    expect(indicatorOf({ instances: [finished], available: [] }, editor.user)).toEqual({
      kind: "idle",
      finished,
      tone: "success",
    });
    const stopped = inReview();
    stopped.abort();
    const aborted = stopped.view(editor);
    expect(indicatorOf({ instances: [aborted], available }, editor.user)).toEqual({
      kind: "idle",
      finished: aborted,
      tone: "neutral",
    });
  });

  it("drafting waits on anyone: neutral", () => {
    const sim = createWorkflowSimulator(editorialReview);
    const state: WorkflowState = { instances: [sim.view({ user: "u1" })], available: [] };
    expect(indicatorOf(state, "u1")).toMatchObject({
      kind: "run",
      tone: "neutral",
      waitsOnMe: false,
      more: 0,
    });
  });

  it("review waits on the reviewer (attention); for anyone else it is in progress (neutral)", () => {
    const sim = inReview(editor.user);
    expect(toneOf(sim.view(editor), editor.user)).toBe("attention");
    const other = sim.view({ user: "u-author" });
    expect(waitsOn(other, "u-author")).toBe(false);
    expect(toneOf(other, "u-author")).toBe("neutral");
  });

  it("a role pool waits on a member who may act, not on someone outside it", () => {
    const sim = inReview();
    expect(toneOf(sim.view(editor), editor.user)).toBe("attention");
    expect(toneOf(sim.view({ user: "u-author", roles: [] }), "u-author")).toBe("neutral");
  });

  it("completed is success, stopped is muted, stuck is an error", () => {
    const done = inReview(editor.user);
    done.fire("approve", editor);
    expect(toneOf(done.view(editor), editor.user)).toBe("success");
    const stopped = inReview();
    stopped.abort();
    expect(toneOf(stopped.view(editor), editor.user)).toBe("muted");
    const view: InstanceView = { ...inReview().view(editor), stuck: "unknown-stage" };
    expect(toneOf(view, editor.user)).toBe("error");
  });

  it("a list row has the same tone, from what the list reports", () => {
    expect(summaryToneOf({ status: "active", waitsOnYou: true })).toBe("attention");
    expect(summaryToneOf({ status: "active", waitsOnYou: false })).toBe("neutral");
    expect(summaryToneOf({ status: "completed", waitsOnYou: false })).toBe("success");
    expect(summaryToneOf({ status: "aborted", waitsOnYou: false })).toBe("muted");
    expect(summaryToneOf({ status: "active", stuck: "unknown-stage", waitsOnYou: true })).toBe(
      "error"
    );
    expect(PILL_STYLE).toEqual({
      attention: "warning",
      neutral: "light",
      success: "success",
      muted: "light-gray",
      error: "error",
    });
  });

  it("names the run waiting on the reader first, and counts the others", () => {
    const drafting = withId(createWorkflowSimulator(editorialReview).view(editor), "a");
    const review = withId(inReview(editor.user).view(editor), "b");
    const state: WorkflowState = { instances: [drafting, review], available: [] };
    expect(indicatorOf(state, editor.user)).toMatchObject({ kind: "run", view: review, more: 1 });
    expect(runsOf(state, editor.user)).toEqual({ active: [review, drafting] });
    expect(indicatorOf(state, "u-nobody")).toMatchObject({ view: drafting, more: 1 });
  });
});

describe("turnOf, shownActions and primaryActionOf", () => {
  const names = (view: InstanceView) =>
    view.activities.flatMap((activity) => shownActions(activity).map((action) => action.name));

  it("drafting: anyone can act, the only button is primary", () => {
    const view = createWorkflowSimulator(editorialReview).view(author);
    expect(turnOf(view, author.user)).toEqual({ kind: "anyone" });
    expect(names(view)).toEqual(["submit"]);
    expect(primaryActionOf(view)).toBe("drafting/submit");
  });

  it("unclaimed review: a member of the role pool is up, someone outside it waits on the role", () => {
    const sim = inReview();
    const mine = sim.view(editor);
    expect(turnOf(mine, editor.user)).toEqual({ kind: "you", roles: ["editor"] });
    expect(names(mine)).toEqual(["claim", "approve", "reject"]);
    expect(primaryActionOf(mine)).toBe("review/claim");
    const theirs = sim.view(author);
    expect(turnOf(theirs, author.user)).toEqual({ kind: "others", users: [], roles: ["editor"] });
    expect(names(theirs)).toEqual([]);
    expect(primaryActionOf(theirs)).toBeUndefined();
  });

  it("claimed review: the reviewer's turn by name; anyone else sees whom it waits on and no buttons", () => {
    const sim = inReview(editor.user);
    const mine = sim.view(editor);
    expect(turnOf(mine, editor.user)).toEqual({ kind: "you", roles: [] });
    expect(names(mine)).toEqual(["approve", "reject"]);
    expect(primaryActionOf(mine)).toBe("review/approve");
    const other = { user: "u-other", roles: ["editor"] };
    const theirs = sim.view(other);
    expect(turnOf(theirs, other.user)).toEqual({
      kind: "others",
      users: [editor.user],
      roles: [],
    });
    expect(names(theirs)).toEqual([]);
  });

  it("open to anyone but the reader: waiting on someone else; with no caller action, nobody", () => {
    const def: WorkflowDefinition = {
      name: "own-work",
      collections: ["pages"],
      initialStage: "review",
      stages: [
        {
          name: "review",
          actions: [
            { name: "approve", status: "done", filter: ({ actor }) => actor.id !== "u-author" },
          ],
          transitions: [{ name: "done", to: "done" }],
        },
        { name: "done" },
      ],
    };
    const sim = createWorkflowSimulator(def);
    expect(turnOf(sim.view(author), author.user)).toEqual({ kind: "othersOpen" });
    expect(turnOf(sim.view(editor), editor.user)).toEqual({ kind: "anyone" });
    const waiting = createWorkflowSimulator({
      ...def,
      stages: [
        { name: "review", transitions: [{ name: "later", to: "done", when: () => false }] },
        { name: "done" },
      ],
    });
    expect(turnOf(waiting.view(author), author.user)).toEqual({ kind: "nobody" });
  });

  it("finished and stuck workflows have no turn", () => {
    const sim = inReview(editor.user);
    sim.fire("approve", editor);
    expect(turnOf(sim.view(editor), editor.user)).toEqual({ kind: "completed" });
    const stuck: InstanceView = { ...inReview().view(editor), stuck: "unknown-stage" };
    expect(turnOf(stuck, editor.user)).toEqual({ kind: "stuck" });
    const aborted: InstanceView = { ...inReview().view(editor), status: "aborted" };
    expect(turnOf(aborted, editor.user)).toEqual({ kind: "aborted" });
  });
});

describe("the drawer's state after an operation (stateAfter)", () => {
  const active = withId(inReview().view(), "1");
  const finished = withId({ ...inReview().view(), status: "completed" }, "0");
  const state: WorkflowState = { instances: [active, finished], available };

  it("takes a fire's answer as the new state while the run stays active", () => {
    const moved = withId({ ...active, stage: { name: "x", title: "X" } }, "1");
    expect(stateAfter(state, "fire", moved)).toEqual({ ...state, instances: [moved, finished] });
  });

  it("puts a started run first and its workflow out of `available`", () => {
    const started = withId(inReview().view(), "2");
    expect(stateAfter({ instances: [finished], available }, "start", started)).toEqual({
      instances: [started, finished],
      available: [],
    });
  });

  it("refetches when the run finished, was stopped, is unknown, or nothing is loaded", () => {
    expect(stateAfter(state, "fire", { ...active, status: "completed" })).toBeNull();
    expect(stateAfter(state, "abort", { ...active, status: "aborted" })).toBeNull();
    expect(stateAfter(state, "fire", withId(active, "9"))).toBeNull();
    expect(stateAfter(null, "fire", active)).toBeNull();
    expect(stateAfter(state, "fire", undefined)).toBeNull();
  });
});

describe("publishNoteOf and the indicator (requiredToPublish)", () => {
  const required = { ...editorialReview, requiredToPublish: "approved" };
  const completed = (publishedAt?: string): InstanceView => {
    const sim = createWorkflowSimulator(required);
    sim.fire("submit", author);
    sim.fire("claim", editor);
    sim.fire("approve", editor);
    const view = sim.view(editor);
    return publishedAt ? { ...view, publishedAt } : view;
  };
  const refusedNone = { clear: false, reason: "Publishing requires a completed Editorial review." };

  it("not started (or stopped) and required: required, asking for attention", () => {
    const state: WorkflowState = {
      instances: [],
      available: [{ ...available[0]!, requiredToPublish: ["approved"] }],
      publish: refusedNone,
    };
    expect(publishNoteOf(state, undefined)).toBe("required");
    expect(indicatorOf(state, "u1")).toEqual({
      kind: "idle",
      tone: "attention",
      publish: "required",
    });
    // Even for someone who may not start it.
    expect(indicatorOf({ ...state, available: [] }, "u1")).toMatchObject({ publish: "required" });
    const stopped = inReview();
    stopped.abort();
    const aborted = stopped.view(editor);
    expect(publishNoteOf({ ...state, instances: [aborted] }, aborted)).toBe("required");
  });

  it("completed and unused: ready; completed and used: used; in progress: nothing", () => {
    const ready = completed();
    const state: WorkflowState = { instances: [ready], available: [], publish: { clear: true } };
    expect(publishNoteOf(state, ready)).toBe("ready");
    expect(indicatorOf(state, editor.user)).toEqual({
      kind: "idle",
      finished: ready,
      tone: "success",
      publish: "ready",
    });
    const used = completed("2026-01-01T00:00:00.000Z");
    expect(publishNoteOf({ ...state, instances: [used], publish: refusedNone }, used)).toBe("used");
    const running = inReview().view(editor);
    expect(publishNoteOf({ ...state, instances: [running], publish: refusedNone }, running)).toBe(
      undefined
    );
  });

  it("completed in a stage that does not approve: unapproved, asking for a new run", () => {
    // As a run of a workflow with a second ending ("rejected") would look.
    const rejected: InstanceView = {
      ...completed(),
      stage: { name: "rejected", title: "Rejected" },
    };
    const state: WorkflowState = {
      instances: [rejected],
      available: [{ ...available[0]!, requiredToPublish: ["approved"] }],
      publish: refusedNone,
    };
    expect(publishNoteOf(state, rejected)).toBe("unapproved");
    expect(indicatorOf(state, editor.user)).toEqual({
      kind: "idle",
      finished: rejected,
      tone: "attention",
      publish: "unapproved",
    });
    // Two approving endings: either one is ready.
    const twice = { ...rejected, requiredToPublish: ["approved", "rejected"] };
    expect(publishNoteOf({ ...state, instances: [twice] }, twice)).toBe("ready");
  });

  it("says nothing when no workflow is required", () => {
    const sim = inReview(editor.user);
    sim.fire("approve", editor);
    const finished = sim.view(editor);
    expect(publishNoteOf({ instances: [finished], available: [] }, finished)).toBeUndefined();
    expect(publishNoteOf({ instances: [], available }, undefined)).toBeUndefined();
  });
});
