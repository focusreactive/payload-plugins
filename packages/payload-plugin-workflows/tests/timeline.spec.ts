import { describe, expect, it } from "vitest";

import {
  actorKind,
  dayKey,
  groupByDay,
  isAutomatic,
  timelineRows,
} from "../src/components/shared/timeline.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import type { HistoryEntry } from "../src/types.js";
import { editor, editorialReview } from "./fixtures.js";

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
    sim.fire("write", "submit", { user: "u-author" });
    sim.fire("review", "claim", editor);
    sim.fire("review", "reject", { ...editor, params: { reason: "Too long" } });
    sim.fire("write", "submit", { user: "u-author" });
    sim.fire("review", "approve", editor);
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
