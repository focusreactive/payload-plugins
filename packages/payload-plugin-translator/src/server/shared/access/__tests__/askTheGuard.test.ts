import { describe, expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";

import { askTheGuard } from "../askTheGuard.js";
import type { AccessGuard } from "../types.js";

const req = { user: { id: "u1" } } as unknown as PayloadRequest;

const answering = (answer: unknown): AccessGuard =>
  ({ check: vi.fn().mockResolvedValue(answer) }) as unknown as AccessGuard;

describe("askTheGuard", () => {
  it("allows only on the literal true", async () => {
    await expect(askTheGuard(answering(true), req, "enqueue")).resolves.toBe(true);
  });

  it("refuses a truthy answer that is not true", async () => {
    await expect(askTheGuard(answering("yes"), req, "enqueue")).resolves.toBe(false);
  });

  it("refuses a false answer", async () => {
    await expect(askTheGuard(answering(false), req, "enqueue")).resolves.toBe(false);
  });

  it("refuses when the guard throws, and says so rather than letting it out", async () => {
    const exploding = {
      check: vi.fn().mockRejectedValue(new Error("guard exploded")),
    } as unknown as AccessGuard;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(askTheGuard(exploding, req, "enqueue")).resolves.toBe(false);

    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("lets a framework navigation signal through instead of reading it as an answer", async () => {
    const navigating = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/login;307;",
    });
    const guard = { check: vi.fn().mockRejectedValue(navigating) } as unknown as AccessGuard;

    await expect(askTheGuard(guard, req, "enqueue")).rejects.toBe(navigating);
  });

  it("hands the guard the request and the action it was asked about", async () => {
    const guard = answering(true);

    await askTheGuard(guard, req, "dismiss-staleness");

    expect(guard.check).toHaveBeenCalledWith({ req, action: "dismiss-staleness" });
  });
});
