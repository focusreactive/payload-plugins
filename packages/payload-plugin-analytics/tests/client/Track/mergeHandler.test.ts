import { describe, expect, it, vi } from "vitest";
import { mergeHandler } from "../../../src/client/Track/mergeHandler";

function throwingHandler() {
  throw new Error("boom");
}

describe("mergeHandler", () => {
  it("calls ours first, then original", () => {
    const calls: string[] = [];
    const original = vi.fn(() => calls.push("original"));
    const ours = vi.fn(() => calls.push("ours"));
    const merged = mergeHandler<string>(original, ours);
    merged("event");
    expect(calls).toEqual(["ours", "original"]);
    expect(original).toHaveBeenCalledWith("event");
    expect(ours).toHaveBeenCalledWith("event");
  });

  it("treats undefined original as no-op", () => {
    const ours = vi.fn();
    const merged = mergeHandler<string>(undefined, ours);
    expect(() => merged("e")).not.toThrow();
    expect(ours).toHaveBeenCalledOnce();
  });

  it("propagates throws from ours (original does not run)", () => {
    const original = vi.fn();
    const merged = mergeHandler<string>(original, throwingHandler);
    expect(() => merged("e")).toThrow("boom");
    expect(original).not.toHaveBeenCalled();
  });
});
