import { describe, expect, it } from "vitest";

import { createWorkflowSimulator } from "../src/engine/simulator.js";
import { eventOf, toRow } from "../src/server/events.js";
import type { WorkflowEvent } from "../src/types.js";
import { editor, editorialReview } from "./fixtures.js";

const owner = { run: 12, workflow: "editorial-review", subject: { collection: "pages", id: "7" } };

describe("events as rows", () => {
  it("round-trips every entry of a run, columns for what audits filter on, the rest in detail", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: "u-author" });
    sim.fire("claim", editor);
    sim.fire("reject", { ...editor, params: { reason: "Too long" } });
    sim.abort("Duplicate", editor);
    for (const event of sim.events) {
      expect(eventOf(toRow(event, owner))).toEqual(event);
    }
    const reject = sim.events.find((entry) => entry.type === "action" && entry.action === "reject");
    expect(toRow(reject!, owner)).toEqual({
      run: "12",
      seq: reject!.seq,
      type: "action",
      at: reject!.at,
      workflow: "editorial-review",
      subjectCollection: "pages",
      subjectId: "7",
      stage: "review",
      activity: "review",
      action: "reject",
      actorId: "u-editor",
      actorCollection: "users",
      via: "api",
      cause: null,
      detail: { params: { reason: "Too long" } },
    });
  });

  it("keeps a cause's kind as a column and the rest of it in detail", () => {
    const event: WorkflowEvent = {
      seq: 4,
      at: "2026-01-01T00:00:00.000Z",
      actor: { system: true },
      cause: { kind: "effect", effect: "llm-check", job: "88" },
      type: "transition",
      stage: "a",
      transition: "pass",
      toStage: "b",
    };
    const row = toRow(event, owner);
    expect(row).toMatchObject({
      actorId: null,
      cause: "effect",
      transition: "pass",
      toStage: "b",
      detail: { cause: { effect: "llm-check", job: "88" } },
    });
    expect(eventOf(row)).toEqual(event);
  });

  it("keeps every field of an entry type this version does not know", () => {
    const future = {
      seq: 9,
      at: "2026-01-01T00:00:00.000Z",
      actor: { id: "u1", collection: "users", via: "agent" },
      type: "escalated",
      stage: "review",
      to: "legal",
      urgency: 3,
    } as WorkflowEvent;
    const row = toRow(future, owner);
    expect(row).toMatchObject({ type: "escalated", detail: { to: "legal", urgency: 3 } });
    expect(eventOf(row)).toEqual(future);
  });
});
