import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { SOURCE_ORDER, translateField } from "./fieldSurfaceFixture";
import type { TestPayload } from "./bootTestPayload";

describe("per-field translation, the mode off", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ fieldSurface: true });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("keeps source order, translating node by node", async () => {
    expect(await translateField(ctx)).toEqual(SOURCE_ORDER);
  });
});
