import { describe, expect, it } from "vitest";
import { measureDescription, measureTitle } from "../../src/measure/measure";

describe("measureDescription", () => {
  it("flags short text", () => {
    const m = measureDescription("short");
    expect(m).toMatchObject({ unit: "char", value: 5, min: 120, max: 160, status: "short" });
  });
  it("accepts in-range text", () => {
    const m = measureDescription("x".repeat(140));
    expect(m.status).toBe("good");
  });
  it("flags long text", () => {
    expect(measureDescription("x".repeat(200)).status).toBe("long");
  });
  it("honors range overrides", () => {
    expect(measureDescription("x".repeat(40), { min: 30, max: 50 }).status).toBe("good");
  });
});

describe("measureTitle", () => {
  it("returns pixel unit and a max", () => {
    const m = measureTitle("Hello world");
    expect(m.unit).toBe("px");
    expect(m.max).toBeGreaterThan(0);
    expect(["short", "good", "long"]).toContain(m.status);
  });
  it("flags very long titles as long", () => {
    expect(measureTitle("word ".repeat(40)).status).toBe("long");
  });
});
