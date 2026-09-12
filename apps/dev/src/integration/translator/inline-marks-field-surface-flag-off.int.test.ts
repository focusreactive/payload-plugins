import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { SOURCE_ORDER, translateField } from "./fieldSurfaceFixture";
import type { TestPayload } from "./bootTestPayload";

describe("per-field translation, the provider able but the mode off", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ declareCapability: true, fieldSurface: true });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  // The fourth corner of (flag × capability), and the only one that separates "forwards the
  // configured flag" from "reads the provider's capability": in the other three the two agree.
  it("keeps the per-node path, because the option is what decides", async () => {
    expect(await translateField(ctx)).toEqual(SOURCE_ORDER);
  });
});
