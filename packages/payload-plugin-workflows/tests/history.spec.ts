import { describe, expect, it } from "vitest";

import type { T } from "../src/components/shared/format.js";
import {
  actorKind,
  dayKey,
  enteredBecause,
  groupByDay,
  lastStepOf,
  isAutomatic,
  mergeHistory,
  rowCause,
  rowDetails,
  rowWhat,
  rowWho,
  stepSentence,
  timelineRows,
} from "../src/components/shared/history.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import { en } from "../src/translations.js";
import type { KnownWorkflowEvent, WorkflowEvent } from "../src/types.js";
import { editor, editorialReview } from "./fixtures.js";

/** Payload's interpolation and `_one` / `_other` plurals over the English strings. */
const t: T = (key, vars = {}) => {
  const table = en as Record<string, string>;
  const count = vars.count;
  const template =
    (typeof count === "number" ? table[`${key}_${count === 1 ? "one" : "other"}`] : undefined) ??
    table[key] ??
    key;
  return template.replace(/\{\{(\w+)\}\}/gu, (_, name: string) => String(vars[name] ?? ""));
};

const SYSTEM = { system: true } as const;
const ann = { id: "u1", via: "admin" as const };

/** Local times, so day grouping does not depend on the machine's time zone. */
const local = (day: number, hour: number, minute = 0, second = 0) =>
  new Date(2026, 0, day, hour, minute, second).toISOString();

/** An entry before it is numbered. */
type Unnumbered = KnownWorkflowEvent extends infer E
  ? E extends unknown
    ? Omit<E, "seq">
    : never
  : never;

/** Entries numbered 1, 2, … as a run's history is. */
const numbered = (entries: Unnumbered[]): WorkflowEvent[] =>
  entries.map((entry, i) => ({ ...entry, seq: i + 1 }) as WorkflowEvent);

describe("actor kinds", () => {
  it("tells a person, the API, an agent and the workflow apart", () => {
    expect(actorKind(ann)).toBe("person");
    expect(actorKind({ ...ann, via: "api" })).toBe("api");
    expect(actorKind({ ...ann, via: "agent" })).toBe("agent");
    expect(actorKind(SYSTEM)).toBe("system");
  });

  it("treats the engine's steps (automatic actions too) as automatic", () => {
    const at = local(1, 9);
    expect(isAutomatic({ seq: 1, at, actor: SYSTEM, type: "completed", stage: "s" })).toBe(true);
    const action = { seq: 1, at, type: "action", stage: "s", activity: "a", action: "x" } as const;
    expect(isAutomatic({ ...action, actor: SYSTEM })).toBe(true);
    expect(isAutomatic({ ...action, actor: ann })).toBe(false);
  });
});

describe("timelineRows", () => {
  it("folds a full run with a rejection loop into one row per human step, newest first", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u-author" });
    sim.fire("claim", editor);
    sim.fire("reject", { ...editor, params: { reason: "Too long" } });
    sim.fire("submit", { user: "u-author" });
    sim.fire("approve", editor);
    const history = sim.events;
    const rows = timelineRows(history);

    // Started by the system (its own row), then five human steps; nothing is lost.
    expect(
      rows.map((row) => [row.kind, row.lead?.type === "action" ? row.lead.action : null])
    ).toEqual([
      ["api", "approve"],
      ["api", "submit"],
      ["api", "reject"],
      ["api", "claim"],
      ["api", "submit"],
      ["system", null],
    ]);
    const total = rows.reduce((sum, row) => sum + (row.lead ? 1 : 0) + row.steps.length, 0);
    expect(total).toBe(history.length);

    const [approve, resubmit, reject, claim] = rows;
    expect(approve?.movedTo).toBe("approved");
    expect(approve?.completed).toBe(true);
    expect(approve?.steps.map((step) => step.type)).toEqual(["effect", "transition", "completed"]);
    expect(resubmit?.movedTo).toBe("review");
    // Entering review fires the automatic "reset": folded under the submit that caused it.
    expect(
      resubmit?.steps.some((step) => step.type === "action" && step.actor.id === undefined)
    ).toBe(true);
    expect(reject?.movedTo).toBe("drafting");
    expect(reject?.lead).toMatchObject({ params: { reason: "Too long" } });
    expect(claim?.steps).toEqual([]);
    expect(claim?.movedTo).toBeUndefined();
  });

  it("folds what a step caused, even much later (its effects); what nobody caused is its own row", () => {
    const save = { kind: "save", by: { id: "u2" } } as const;
    const history = numbered([
      { at: local(1, 9), actor: ann, type: "started", stage: "drafting", definitionVersion: "v" },
      {
        at: local(1, 9),
        actor: SYSTEM,
        type: "effect",
        stage: "drafting",
        effect: "notify",
        status: "queued",
      },
      // The effect it queued fails two hours later: still that step's.
      {
        at: local(1, 11),
        actor: SYSTEM,
        type: "effect",
        stage: "drafting",
        effect: "notify",
        status: "failed",
        error: "SMTP",
      },
      // A document save, a minute after that, moves the run: nobody's step caused it.
      {
        at: local(1, 11, 1),
        actor: SYSTEM,
        cause: save,
        type: "transition",
        stage: "drafting",
        toStage: "review",
        transition: "t",
      },
      { at: local(1, 11, 1), actor: SYSTEM, cause: save, type: "completed", stage: "review" },
    ]);
    const rows = timelineRows(history);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      kind: "system",
      movedTo: "review",
      completed: true,
      key: "4",
      cause: save,
    });
    expect(rows[0]?.lead).toBeUndefined();
    expect(rows[0]?.steps).toHaveLength(2);
    expect(rows[1]).toMatchObject({ kind: "person", key: "1", completed: false });
    expect(rows[1]?.steps).toHaveLength(2);
    expect(rows[1]?.failed).toHaveLength(1);
  });

  it("an automatic step right after a person's, but from another operation, is not theirs", () => {
    const rows = timelineRows(
      numbered([
        { at: local(1, 9), actor: ann, type: "started", stage: "drafting", definitionVersion: "v" },
        {
          at: local(1, 9, 0, 5),
          actor: SYSTEM,
          type: "transition",
          stage: "drafting",
          toStage: "review",
          transition: "t",
        },
      ])
    );
    expect(rows.map((row) => row.kind)).toEqual(["system", "person"]);
  });

  it("keeps an agent's step as its own row", () => {
    const rows = timelineRows(
      numbered([
        { at: local(1, 9), actor: ann, type: "started", stage: "drafting", definitionVersion: "v" },
        {
          at: local(1, 9, 0, 5),
          actor: { ...ann, via: "agent" },
          type: "action",
          stage: "drafting",
          activity: "write",
          action: "submit",
        },
      ])
    );
    expect(rows.map((row) => row.kind)).toEqual(["agent", "person"]);
  });

  it("is empty for an empty history", () => {
    expect(timelineRows([])).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("groups newest-first rows under today, yesterday and older days", () => {
    const rows = timelineRows(
      numbered([
        { at: local(1, 9), actor: ann, type: "started", stage: "drafting", definitionVersion: "v" },
        { at: local(3, 23, 50), actor: ann, type: "aborted", stage: "drafting" },
        { at: local(4, 8), actor: ann, type: "aborted", stage: "drafting" },
        { at: local(4, 10), actor: ann, type: "aborted", stage: "drafting" },
      ])
    );
    const days = groupByDay(rows, new Date(2026, 0, 4, 12));
    expect(days.map((day) => [day.key, day.relative, day.rows.length])).toEqual([
      [dayKey(new Date(2026, 0, 4)), "today", 2],
      [dayKey(new Date(2026, 0, 3)), "yesterday", 1],
      [dayKey(new Date(2026, 0, 1)), null, 1],
    ]);
  });
});

describe("how rows read", () => {
  it("names who acted and what happened, with the definition's titles, even for stages the run left", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u1" });
    sim.fire("claim", { user: "u2", roles: ["editor"] });
    sim.fire("reject", { user: "u2", roles: ["editor"], params: { reason: "Too long" } });
    const { titles } = sim.view({ user: "u1" });
    const people = { me: "u1", labels: { u2: "Bea" } };
    const lines = timelineRows(sim.events).map((row) => [
      rowWho(row, people, t),
      rowWhat(row, titles, t),
      rowDetails(row, titles, t),
    ]);
    expect(lines).toEqual([
      ["Bea", "Request changes → moved to Drafting", ["Reason: Too long"]],
      ["Bea", "Take this review", []],
      ["You", "Submit for review → moved to Review", []],
      ["Automated", "Started in Drafting", []],
    ]);
    const reset = sim.events.find((entry) => entry.type === "action" && !entry.actor.id);
    expect(reset && stepSentence(reset, titles, t)).toBe("Reset in Review.");
  });

  it("an agent acts for a person; a system abort keeps its reason", () => {
    const at = local(1, 9);
    const [agentRow] = timelineRows(
      numbered([
        { at, actor: { ...ann, via: "agent" }, type: "aborted", stage: "s", reason: "Duplicate" },
      ])
    );
    expect(agentRow && rowWho(agentRow, { labels: { u1: "Ann" } }, t)).toBe("Ann · AI agent");
    const [systemRow] = timelineRows(
      numbered([{ at, actor: SYSTEM, type: "aborted", stage: "s", reason: "Subject deleted" }])
    );
    expect(systemRow && [rowWho(systemRow, {}, t), rowWhat(systemRow, {}, t)]).toEqual([
      "Automated",
      "Stopped the workflow",
    ]);
    expect(systemRow && rowDetails(systemRow, {}, t)).toEqual(["Reason: Subject deleted"]);
  });

  it("says each automatic step as a sentence", () => {
    const at = local(1, 9);
    const say = (entry: Unnumbered) => stepSentence({ ...entry, seq: 1 } as WorkflowEvent, {}, t);
    const effect = { at, actor: SYSTEM, type: "effect", stage: "review" } as const;
    expect(
      say({ at, actor: SYSTEM, type: "started", stage: "drafting", definitionVersion: "v" })
    ).toBe("Started in Drafting.");
    expect(say({ ...effect, effect: "notify-author", status: "failed", error: "SMTP down" })).toBe(
      "Notify author failed: SMTP down"
    );
    expect(say({ ...effect, effect: "notify-author", status: "done" })).toBe(
      "Notify author finished."
    );
    expect(say({ ...effect, effect: "llm-check", status: "done", stale: true })).toBe(
      "Llm check finished after the workflow had moved on from the step that started it; its result was ignored."
    );
    expect(say({ at, actor: SYSTEM, type: "completed", stage: "approved" })).toBe(
      "The workflow completed."
    );
    expect(
      say({
        at,
        actor: ann,
        type: "guard-bypassed",
        stage: "review",
        operation: "publish",
        guards: ["hold"],
      })
    ).toBe("Went past the hold on publishing.");
    expect(say({ at, actor: ann, type: "published", stage: "approved" })).toBe(
      "The document was published with this approval."
    );
  });

  it("a publish that used the run is a row of the person who published", () => {
    const published = {
      seq: 9,
      at: local(1, 9),
      actor: ann,
      type: "published",
      stage: "approved",
    } as const;
    const [row] = timelineRows([published]);
    expect(row).toMatchObject({ kind: "person", lead: published });
    expect(rowWhat(row!, undefined, t)).toBe("Published the document with this approval");
  });
});

describe("enteredBecause", () => {
  it("names the person's step with params that sent the run back, until it moves on", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u1" });
    expect(enteredBecause(sim.view({ user: "u1" }), t)).toBeUndefined();
    sim.fire("claim", { user: "u2", roles: ["editor"] });
    sim.fire("reject", { user: "u2", roles: ["editor"], params: { reason: "Too long" } });
    expect(enteredBecause(sim.view({ user: "u1" }), t)).toEqual({
      actor: { id: "u2", via: "api" },
      action: "Request changes",
      details: ["Reason: Too long"],
    });
    // Submitted again: the step that brought it to review has no params, so nothing to explain.
    sim.fire("submit", { user: "u1" });
    expect(enteredBecause(sim.view({ user: "u1" }), t)).toBeUndefined();
  });
});

describe("who started it and lastStepOf", () => {
  it("names who started the workflow and the last step a person took", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u-author" });
    sim.fire("claim", { user: "u-editor", roles: ["editor"] });
    sim.fire("approve", { user: "u-editor", roles: ["editor"] });
    const view = sim.view({ user: "u-editor" });
    expect(view.started.actor.id).toBeUndefined();
    const last = lastStepOf(view);
    expect(last.actor?.id).toBe("u-editor");
    expect(last.action).toBe("Approve");
    expect(last.at).toBe(view.history.at(-1)?.at);
  });
});

const entry = (i: number): WorkflowEvent => ({
  seq: i + 1,
  at: `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`,
  actor: { system: true },
  type: "completed",
  stage: "s",
});

describe("older history read on demand (mergeHistory)", () => {
  const all = Array.from({ length: 30 }, (_, i) => entry(i));
  const viewOf = (older: number) => ({ history: all.slice(older), olderHistory: older });

  it("shows the view alone until something older is loaded", () => {
    expect(mergeHistory(viewOf(20), [])).toEqual({ history: all.slice(20), older: 20 });
  });

  it("puts loaded entries before the view's, and keeps them as later views move on", () => {
    const loaded = all.slice(10, 20);
    expect(mergeHistory(viewOf(20), loaded)).toEqual({ history: all.slice(10), older: 10 });
    // After an action the view starts later; what was loaded still reaches it.
    expect(mergeHistory(viewOf(15), loaded)).toEqual({ history: all.slice(10), older: 10 });
  });

  it("drops loaded entries that no longer reach the view (a gap)", () => {
    expect(mergeHistory(viewOf(25), all.slice(10, 20))).toEqual({
      history: all.slice(25),
      older: 25,
    });
  });
});

describe("entries this version does not know", () => {
  const future = {
    seq: 3,
    at: local(1, 10),
    actor: ann,
    type: "escalated",
    stage: "review",
    to: "legal",
  } as WorkflowEvent;

  it("get a row of their own that names them, and are never dropped", () => {
    const rows = timelineRows([
      entry(0),
      { ...entry(1), type: "transition", stage: "a", toStage: "review", transition: "t" },
      future,
    ]);
    expect(rows[0]).toMatchObject({ kind: "person", lead: future });
    expect(rows[0] && rowWhat(rows[0], {}, t)).toBe(
      "Escalated (recorded by a newer version of the plugin)."
    );
    expect(rows[0] && rowDetails(rows[0], {}, t)).toEqual([]);
    expect(stepSentence({ ...future, actor: SYSTEM }, {}, t)).toBe(
      "Escalated (recorded by a newer version of the plugin)."
    );
  });
});

describe("what caused an automatic row (rowCause)", () => {
  const row = (cause: WorkflowEvent["cause"]) =>
    timelineRows([{ ...entry(0), ...(cause ? { cause } : {}) }])[0]!;
  const people = { me: "u1", labels: { u2: "Bea" } };

  it("says a save (by whom), a delete, the clock, the auto-start and an effect", () => {
    expect(rowCause(row({ kind: "save", by: { id: "u2" } }), people, t)).toBe(
      "after Bea saved the document"
    );
    expect(rowCause(row({ kind: "save" }), people, t)).toBe("after a save");
    expect(rowCause(row({ kind: "delete" }), people, t)).toBe("after the document was deleted");
    expect(rowCause(row({ kind: "tick" }), people, t)).toBe("on schedule");
    expect(rowCause(row({ kind: "start" }), people, t)).toBe("when the document was created");
    expect(rowCause(row({ kind: "effect", effect: "llm-check", job: "7" }), people, t)).toBe(
      "from Llm check"
    );
    expect(rowCause(row({ kind: "step" }), people, t)).toBeUndefined();
    expect(rowCause(row(undefined), people, t)).toBeUndefined();
  });
});
