import { describe, expect, it } from "vitest";

import {
  formatRelative,
  historySentence,
  humanize,
  readParams,
  waitingOnText,
} from "../src/components/shared/format.js";
import type { T } from "../src/components/shared/format.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import { en } from "../src/translations/en.js";
import type { HistoryEntry, ParamDef } from "../src/types.js";
import { editorialReview } from "./fixtures.js";

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

const at = "2026-01-01T00:00:00.000Z";
const ann = { id: "u1", collection: "users", via: "admin" as const };

describe("history sentences", () => {
  it("names people (the simulator acts via the API) and uses the definition's titles, even for stages the run has left", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("write", "submit", { user: "u1" });
    sim.fire("review", "claim", { user: "u2", roles: ["editor"] });
    sim.fire("review", "reject", { user: "u2", roles: ["editor"], params: { reason: "Too long" } });
    const view = sim.view({ user: "u1" });
    const people = { me: "u1", labels: { u2: "Bea" } };
    const sentences = view.history.map((entry) => historySentence(entry, view, people, t));
    expect(sentences).toContain("You (via the API) chose “Submit for review” on Write the page.");
    expect(sentences).toContain("Moved from Drafting to Review.");
    expect(sentences).toContain("“Reset” ran on Review the page.");
    expect(sentences).toContain("Bea (via the API) chose “Take this review” on Review the page.");
    expect(sentences).toContain(
      "Bea (via the API) chose “Request changes” on Review the page. Reason: Too long"
    );
    expect(sentences).toContain("Moved from Review to Drafting.");
  });

  it("covers the system, agents, effects, completion and abort", () => {
    const view = { titles: {} };
    const say = (entry: HistoryEntry) => historySentence(entry, view, {}, t);
    expect(say({ at, actor: { system: true }, type: "started", stage: "drafting" })).toBe(
      "The workflow started the run in Drafting."
    );
    expect(say({ at, actor: { ...ann, via: "agent" }, type: "aborted", reason: "Duplicate" })).toBe(
      "u1 (via an agent) aborted the run: Duplicate"
    );
    expect(
      say({
        at,
        actor: { system: true },
        type: "effect",
        effect: "notify-author",
        status: "failed",
        error: "SMTP down",
      })
    ).toBe("Notify author failed: SMTP down");
    expect(
      say({ at, actor: { system: true }, type: "effect", effect: "notify-author", status: "done" })
    ).toBe("Notify author finished.");
    expect(say({ at, actor: { system: true }, type: "completed" })).toBe("The run completed.");
  });
});

describe("waiting on", () => {
  it("says you, display names, raw ids it cannot resolve, and roles", () => {
    expect(
      waitingOnText(
        { users: ["u1", "u2", "u3"], roles: ["editor"] },
        { me: "u1", labels: { u2: "Bea" } },
        t
      )
    ).toBe("you, Bea, u3, editor (role)");
    expect(waitingOnText({ users: [], roles: [] }, {}, t)).toBe("");
  });
});

describe("param form", () => {
  const defs: ParamDef[] = [
    { name: "reason", type: "text", title: "Reason", required: true },
    { name: "score", type: "number" },
    { name: "urgent", type: "boolean" },
    { name: "due", type: "date" },
    { name: "kind", type: "select", options: ["a", { label: "B", value: "b" }] },
  ];

  it("requires required fields and checks numbers, by the field's title", () => {
    expect(
      readParams(defs, { reason: "  ", score: "ten", urgent: false, due: "", kind: "" }, t)
    ).toEqual({
      params: { urgent: false },
      errors: { reason: "Reason is required.", score: "Score must be a number." },
    });
  });

  it("returns typed params; empty optional fields are left out", () => {
    expect(
      readParams(
        defs,
        { reason: " Too long ", score: "4.5", urgent: true, due: "2026-02-03", kind: "b" },
        t
      )
    ).toEqual({
      params: {
        reason: "Too long",
        score: 4.5,
        urgent: true,
        due: "2026-02-03T00:00:00.000Z",
        kind: "b",
      },
      errors: {},
    });
  });
});

describe("helpers", () => {
  it("humanizes names", () => {
    expect(humanize("request-changes")).toBe("Request changes");
  });

  it("formats relative dates in the admin language", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    expect(formatRelative("2026-01-01T11:57:00.000Z", now, "en")).toBe("3 minutes ago");
    expect(formatRelative("2026-01-01T11:59:59.000Z", now, "en")).toBe("now");
  });
});
