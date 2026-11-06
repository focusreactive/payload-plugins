import { describe, it, expect } from "vitest";

import { owedOnCancel } from "../model/owedOnCancel.js";
import type { PayloadJob } from "../store/types.js";

const run = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
  id: 7,
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:01:00Z",
  input: { handle: "run-1", locales: ["de", "fr"] },
  ...overrides,
});

const LOCALES = ["de", "fr"];

describe("owedOnCancel", () => {
  it("owes every locale of a run that has not started", () => {
    expect(owedOnCancel(run(), LOCALES)).toEqual(["de", "fr"]);
  });

  it("owes a locale whose attempt failed while the run can still try again", () => {
    const betweenAttempts = run({
      error: { message: "provider down" },
      log: [{ state: "failed", input: { target_lng: "de" } }],
    });

    expect(owedOnCancel(betweenAttempts, LOCALES)).toEqual(["de", "fr"]);
  });

  it("does not owe a locale the run delivered", () => {
    const halfDone = run({
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:01:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(owedOnCancel(halfDone, LOCALES)).toEqual(["fr"]);
  });

  it("owes nothing once the run has given up", () => {
    const spent = run({
      hasError: true,
      error: { message: "provider down" },
      log: [{ state: "failed", input: { target_lng: "de" } }],
    });

    expect(
      owedOnCancel(spent, LOCALES),
      "giving up settled every locale it had not delivered; a second ending is one too many"
    ).toEqual([]);
  });
});
