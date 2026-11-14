import { describe, expect, expectTypeOf, it } from "vitest";

import type { TranslatorAction } from "../TranslatorAction.js";

/** The nine the routes actually pass, listed here independently of the union's declaration. */
const THE_NINE = [
  "enqueue",
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
  it("admits each of the nine route actions", () => {
    expectTypeOf<(typeof THE_NINE)[number]>().toExtend<TranslatorAction>();
    expect(new Set(THE_NINE).size).toBe(9);
  });

  it("is closed — it admits nothing the routes do not pass", () => {
    expectTypeOf<TranslatorAction>().toExtend<(typeof THE_NINE)[number]>();
    expectTypeOf<"queued">().not.toExtend<TranslatorAction>();
    expectTypeOf<string>().not.toExtend<TranslatorAction>();
  });
});
