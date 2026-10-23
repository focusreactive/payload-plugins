import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { BOLD, translateField, UNFORMATTED } from "./fieldSurfaceFixture";
import type { TestPayload } from "./bootTestPayload";

describe("per-field translation, a provider that declares marks", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ declaresInlineMarks: true, fieldSurface: true });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("returns the paragraph in the order the reply came back", async () => {
    expect(await translateField(ctx)).toEqual([
      ["de: car", UNFORMATTED],
      ["de:red", BOLD],
      ["de:a ", UNFORMATTED],
    ]);
  });
});
