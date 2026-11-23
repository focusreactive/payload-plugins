import { describe, expect, it } from "vitest";

import type { T } from "../src/components/shared/format.js";
import {
  actorKind,
  dayKey,
  groupByDay,
  lastStepOf,
  isAutomatic,
  rowDetails,
  rowWhat,
  rowWho,
  startOf,
  stepSentence,
  timelineRows,
} from "../src/components/shared/history.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import { en } from "../src/translations.js";
import type { HistoryEntry } from "../src/types.js";
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
const ann = { id: "u1", collection: "users", via: "admin" as const };

/** Local times, so day grouping does not depend on the machine's time zone. */
const local = (day: number, hour: number, minute = 0, second = 0) =>
  new Date(2026, 0, day, hour, minute, second).toISOString();

describe("actor kinds", () => {
  it("tells a person, the API, an agent and the workflow apart", () => {
    expect(actorKind(ann)).toBe("person");
    expect(actorKind({ ...ann, via: "api" })).toBe("api");
    expect(actorKind({ ...ann, via: "agent" })).toBe("agent");
    expect(actorKind(SYSTEM)).toBe("system");
  });

  it("treats the engine's steps and automatic actions as automatic", () => {
    const at = local(1, 9);
    expect(isAutomatic({ at, actor: SYSTEM, type: "completed" })).toBe(true);
    expect(
      isAutomatic({
        at,
        actor: SYSTEM,
        type: "action",
        stage: "s",
        activity: "a",
        action: "x",
        auto: true,
      })
    ).toBe(true);
    expect(
      isAutomatic({
        at,
        actor: ann,
        type: "action",
        stage: "s",
        activity: "a",
        action: "x",
        auto: false,
      })
    ).toBe(false);
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
    const history = sim.state.history;
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
    expect(resubmit?.steps.some((step) => step.type === "action" && step.auto)).toBe(true);
    expect(reject?.movedTo).toBe("drafting");
    expect(reject?.lead).toMatchObject({ params: { reason: "Too long" } });
    expect(claim?.steps).toEqual([]);
    expect(claim?.movedTo).toBeUndefined();
  });

  it("keeps an automatic step that came much later as its own row, and joins automatic stretches", () => {
    const history: HistoryEntry[] = [
      { at: local(1, 9), actor: ann, type: "started", stage: "drafting" },
      { at: local(1, 9, 0, 1), actor: SYSTEM, type: "effect", effect: "notify", status: "queued" },
      {
        at: local(1, 11),
        actor: SYSTEM,
        type: "effect",
        effect: "notify",
        status: "failed",
        error: "SMTP",
      },
      {
        at: local(1, 11, 0, 30),
        actor: SYSTEM,
        type: "transition",
        from: "drafting",
        to: "review",
        transition: "t",
      },
      { at: local(1, 11, 1, 0), actor: SYSTEM, type: "completed" },
    ];
    const rows = timelineRows(history);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "system", movedTo: "review", completed: true, key: "2" });
    expect(rows[0]?.lead).toBeUndefined();
    expect(rows[0]?.steps).toHaveLength(3);
    expect(rows[0]?.failed).toHaveLength(1);
    expect(rows[1]).toMatchObject({ kind: "person", key: "0", completed: false, failed: [] });
    expect(rows[1]?.steps).toHaveLength(1);
  });

  it("keeps an agent's step as its own row", () => {
    const rows = timelineRows([
      { at: local(1, 9), actor: ann, type: "started", stage: "drafting" },
      {
        at: local(1, 9, 0, 5),
        actor: { ...ann, via: "agent" },
        type: "action",
        stage: "drafting",
        activity: "write",
        action: "submit",
        auto: false,
      },
    ]);
    expect(rows.map((row) => row.kind)).toEqual(["agent", "person"]);
  });

  it("is empty for an empty history", () => {
    expect(timelineRows([])).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("groups newest-first rows under today, yesterday and older days", () => {
    const rows = timelineRows([
      { at: local(1, 9), actor: ann, type: "started", stage: "drafting" },
      { at: local(3, 23, 50), actor: ann, type: "aborted" },
      { at: local(4, 8), actor: ann, type: "aborted" },
      { at: local(4, 10), actor: ann, type: "aborted" },
    ]);
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
    const lines = timelineRows(sim.state.history).map((row) => [
      rowWho(row, people, t),
      rowWhat(row, titles, t),
      rowDetails(row, titles),
    ]);
    expect(lines).toEqual([
      ["Bea", "Request changes → moved to Drafting", ["Reason: Too long"]],
      ["Bea", "Take this review", []],
      ["You", "Submit for review → moved to Review", []],
      ["Automated", "Started in Drafting", []],
    ]);
    const reset = sim.state.history.find((entry) => entry.type === "action" && entry.auto);
    expect(reset && stepSentence(reset, titles, t)).toBe("“Reset” on Review.");
  });

  it("an agent acts for a person; a system abort keeps its reason", () => {
    const at = local(1, 9);
    const [agentRow] = timelineRows([
      { at, actor: { ...ann, via: "agent" }, type: "aborted", reason: "Duplicate" },
    ]);
    expect(agentRow && rowWho(agentRow, { labels: { u1: "Ann" } }, t)).toBe("Ann via agent");
    const [systemRow] = timelineRows([
      { at, actor: SYSTEM, type: "aborted", reason: "Subject deleted" },
    ]);
    expect(systemRow && [rowWho(systemRow, {}, t), rowWhat(systemRow, {}, t)]).toEqual([
      "Automated",
      "Stopped the workflow",
    ]);
    expect(systemRow && rowDetails(systemRow, {})).toEqual(["Subject deleted"]);
  });

  it("says each automatic step as a sentence", () => {
    const at = local(1, 9);
    const say = (entry: HistoryEntry) => stepSentence(entry, {}, t);
    expect(say({ at, actor: SYSTEM, type: "started", stage: "drafting" })).toBe(
      "Started in Drafting."
    );
    expect(
      say({
        at,
        actor: SYSTEM,
        type: "effect",
        effect: "notify-author",
        status: "failed",
        error: "SMTP down",
      })
    ).toBe("Notify author failed: SMTP down");
    expect(
      say({ at, actor: SYSTEM, type: "effect", effect: "notify-author", status: "done" })
    ).toBe("Notify author finished.");
    expect(say({ at, actor: SYSTEM, type: "completed" })).toBe("The workflow completed.");
  });
});

describe("startOf and lastStepOf", () => {
  it("names who started the workflow and the last step a person took", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u-author" });
    sim.fire("claim", { user: "u-editor", roles: ["editor"] });
    sim.fire("approve", { user: "u-editor", roles: ["editor"] });
    const view = sim.view({ user: "u-editor" });
    expect(startOf(view.history)?.actor.id).toBeUndefined();
    const last = lastStepOf(view);
    expect(last.actor?.id).toBe("u-editor");
    expect(last.action).toBe("Approve");
    expect(last.at).toBe(view.history.at(-1)?.at);
  });
});
