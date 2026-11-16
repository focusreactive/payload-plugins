import { describe, expect, it } from "vitest";
import { measureDescription, measureTitle } from "../../src/measure/measure";

describe("measureDescription", () => {
  it("flags short text", () => {
    const m = measureDescription("short");
    expect(m).toMatchObject({ unit: "char", value: 5, min: 120, max: 156, status: "short" });
  });
  it("accepts in-range text", () => {
    const m = measureDescription("x".repeat(140));
    expect(m.status).toBe("good");
  });
  it("flags long text", () => {
    expect(measureDescription("x".repeat(200)).status).toBe("long");
  });
  it("treats a description of exactly the minimum as too short, like Yoast", () => {
    expect(measureDescription("x".repeat(120)).status).toBe("short");
    expect(measureDescription("x".repeat(121)).status).toBe("good");
    expect(measureDescription("x".repeat(156)).status).toBe("good");
    expect(measureDescription("x".repeat(157)).status).toBe("long");
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
  it("never calls a title too short, like the Yoast SEO assessor", () => {
    const m = measureTitle("Hi");
    expect(m.value).toBeLessThan(m.min);
    expect(m.status).toBe("good");
  });
  it("flags titles over the maximum as long", () => {
    expect(measureTitle("Hello world", { max: 50 }).status).toBe("long");
  });
  it("flags very long titles as long", () => {
    expect(measureTitle("word ".repeat(40)).status).toBe("long");
  });
});
