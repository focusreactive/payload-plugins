import { describe, it, expectTypeOf } from "vitest";

import type { ApprovedWrite } from "../targetDocument.js";

describe("ApprovedWrite", () => {
  it("is not assignable from a plain object", () => {
    expectTypeOf<{ title: string }>().not.toExtend<ApprovedWrite>();
  });

  it("cannot be forged by guessing the brand", () => {
    expectTypeOf<{ title: string; __brand: "ApprovedWrite" }>().not.toExtend<ApprovedWrite>();
  });
});
