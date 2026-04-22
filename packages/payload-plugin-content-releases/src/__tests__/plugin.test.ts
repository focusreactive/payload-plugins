import { describe, it, expect } from "vitest";

describe("payload-plugin-content-releases", () => {
  it("should be importable", async () => {
    const mod = await import("../index");
    expect(mod).toBeDefined();
  });
});
