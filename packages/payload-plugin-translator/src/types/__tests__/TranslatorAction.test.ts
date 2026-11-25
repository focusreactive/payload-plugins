import { describe, expect, expectTypeOf, it } from "vitest";

import type { TranslatorAction } from "../TranslatorAction.js";

const ACTIONS_THE_ROUTES_PASS = [
  "enqueue",
  "enqueue-list",
  "run",
  "cancel",
  "cancel-by-collection",
  "document-status",
  "collection-status",
  "document-staleness",
  "dismiss-staleness",
  "translate-field",
] as const;

describe("TranslatorAction", () => {
  it("admits every action the routes pass, each named once", () => {
    expectTypeOf<(typeof ACTIONS_THE_ROUTES_PASS)[number]>().toExtend<TranslatorAction>();
    expect(new Set(ACTIONS_THE_ROUTES_PASS).size).toBe(ACTIONS_THE_ROUTES_PASS.length);
  });

  it("is closed — it admits nothing the routes do not pass", () => {
    expectTypeOf<TranslatorAction>().toExtend<(typeof ACTIONS_THE_ROUTES_PASS)[number]>();
    expectTypeOf<"queued">().not.toExtend<TranslatorAction>();
    expectTypeOf<string>().not.toExtend<TranslatorAction>();
  });
});
