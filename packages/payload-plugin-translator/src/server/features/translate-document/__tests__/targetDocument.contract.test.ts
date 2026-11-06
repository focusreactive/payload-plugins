import { describe, it, expectTypeOf } from "vitest";

import type { ApprovedSource, ApprovedWrite } from "../targetDocument.js";

describe("ApprovedWrite", () => {
  it("is not assignable from a plain object", () => {
    expectTypeOf<{ title: string }>().not.toExtend<ApprovedWrite>();
  });

  it("cannot be forged by guessing the brand", () => {
    expectTypeOf<{ title: string; __brand: "ApprovedWrite" }>().not.toExtend<ApprovedWrite>();
  });
});

describe("ApprovedSource", () => {
  it("is not assignable from a source nobody asked about", () => {
    expectTypeOf<{
      sourceData: Record<string, unknown>;
      currentTarget: Record<string, unknown>;
    }>().not.toExtend<ApprovedSource>();
  });

  it("is not an approved write: the read asked about the source, not the payload sent", () => {
    expectTypeOf<ApprovedSource>().not.toExtend<ApprovedWrite>();
  });
});
