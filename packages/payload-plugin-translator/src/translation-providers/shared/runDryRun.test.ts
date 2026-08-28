import { beforeEach, describe, expect, it, vi } from "vitest";

import { runDryRun } from "./runDryRun";

describe("runDryRun", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reverses every value by default", async () => {
    expect(await runDryRun({ 0: "Hello", 1: "World" }, true)).toEqual({
      0: "olleH",
      1: "dlroW",
    });
  });

  it("uses a custom transformer when one is supplied", async () => {
    const result = await runDryRun({ 0: "Hello" }, { transform: (t) => `[T] ${t}` });

    expect(result).toEqual({ 0: "[T] Hello" });
  });

  it("awaits an async transformer", async () => {
    const result = await runDryRun({ 0: "Hello" }, { transform: async (t) => t.toUpperCase() });

    expect(result).toEqual({ 0: "HELLO" });
  });

  it("leaves empty and whitespace-only values untouched", async () => {
    expect(await runDryRun({ 0: "", 1: "   ", 2: "Hi" }, true)).toEqual({
      0: "",
      1: "   ",
      2: "iH",
    });
  });

  it("waits for the configured delay before returning", async () => {
    vi.useFakeTimers();
    try {
      let settled = false;
      const pending = runDryRun({ 0: "Hello" }, { transform: (t) => t, timeout: 1000 }).then(
        (r) => {
          settled = true;
          return r;
        }
      );

      await vi.advanceTimersByTimeAsync(999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  describe("logging", () => {
    it("reports how many fields were simulated", async () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

      await runDryRun({ 0: "Hello", 1: "World" }, true);

      expect(info).toHaveBeenCalledTimes(1);
      expect(String(info.mock.calls[0].join(" "))).toContain("2 field(s)");
    });

    it("never puts field content in the log", async () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

      await runDryRun({ 0: "Hello", 1: "World" }, { transform: (t) => `[T] ${t}` });

      const logged = String(info.mock.calls[0].join(" "));
      expect(logged).toContain("2 field(s)");
      expect(logged).not.toContain("Hello");
      expect(logged).not.toContain("World");
      expect(logged).not.toContain("[T] ");
    });
  });

  it("returns immediately when no delay is configured", async () => {
    const started = Date.now();
    await runDryRun({ 0: "Hello" }, true);

    expect(Date.now() - started).toBeLessThan(50);
  });
});
