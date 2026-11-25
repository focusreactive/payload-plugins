import { describe, expect, it } from "vitest";

import {
  actionToast,
  formatRelative,
  holdLead,
  humanize,
  operationsText,
  readParams,
  waitingOnText,
} from "../src/components/shared/format.js";
import type { T } from "../src/components/shared/format.js";
import { en } from "../src/translations.js";
import type { ViewParam } from "../src/types.js";

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

describe("waiting on", () => {
  it("says you, display names, raw ids it cannot resolve, and roles", () => {
    expect(
      waitingOnText(
        { users: ["u1", "u2", "u3"], roles: ["editor"] },
        { me: "u1", labels: { u2: "Bea" } },
        t
      )
    ).toBe("you, Bea, u3, anyone with the editor role");
    expect(waitingOnText({ users: [], roles: [] }, {}, t)).toBe("");
  });

  it("names a guard's operations", () => {
    expect(operationsText(["publish", "delete"], t)).toBe("publishing, deleting");
  });
});

describe("param form", () => {
  const defs: ViewParam[] = [
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

const view = (stage: string, status: "active" | "completed" = "active") =>
  ({ status, stage: { name: stage, title: stage.toUpperCase() } }) as never;

describe("action toast", () => {
  it("says where the action moved the workflow, that it finished, or just that it is done", () => {
    expect(actionToast("Submit", view("drafting"), view("review"), t)).toBe(
      "Submit — moved to REVIEW"
    );
    expect(actionToast("Approve", view("review"), view("approved", "completed"), t)).toBe(
      "Approve — workflow complete"
    );
    expect(actionToast("Take this review", view("review"), view("review"), t)).toBe(
      "Take this review — done"
    );
    expect(actionToast("Approve", view("review"), undefined, t)).toBe("Approve — done");
  });
});

describe("holdLead", () => {
  it("says what is on hold, in plain words", () => {
    expect(holdLead(["publish"], t)).toBe("Publishing is on hold.");
    expect(holdLead(["publish", "update"], t)).toBe("Publishing and saving are on hold.");
  });
});
