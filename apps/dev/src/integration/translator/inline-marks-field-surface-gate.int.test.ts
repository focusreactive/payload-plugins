import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { SOURCE_ORDER, translateField } from "./fieldSurfaceFixture";
import type { TestPayload } from "./bootTestPayload";

describe("per-field translation, the mode on but the provider silent about marks", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      inlineMarks: true,
      declareCapability: false,
      fieldSurface: true,
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("keeps the per-node path, because the capability gate outranks the option", async () => {
    expect(await translateField(ctx)).toEqual(SOURCE_ORDER);
  });
});
