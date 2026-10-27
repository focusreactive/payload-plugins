import { describe, it, expect } from "vitest";

import type { PayloadJob } from "../store/types.js";
import { stillOwed } from "../model/stillOwed.js";

const LOCALES = ["de", "fr"];

const run = (log: PayloadJob["log"] = []): PayloadJob => ({
  id: 7,
  createdAt: "2026-10-06T10:00:00Z",
  updatedAt: "2026-10-06T10:01:00Z",
  input: { handle: "run-1", locales: LOCALES },
  log,
});

const delivered = (targetLng: string) => ({
  state: "succeeded",
  completedAt: "2026-10-06T10:01:00Z",
  input: { target_lng: targetLng },
});

const attemptedAndFailed = (targetLng: string) => ({
  state: "failed",
  input: { target_lng: targetLng },
});

describe("which locales of a run are still owed", () => {
  it("owes every locale of a run that has run nothing", () => {
    expect(stillOwed(run(), LOCALES)).toEqual(["de", "fr"]);
  });

  it("stops owing a locale the run delivered", () => {
    expect(stillOwed(run([delivered("de")]), LOCALES)).toEqual(["fr"]);
  });

  it("still owes a locale whose attempt failed, because a retry may yet deliver it", () => {
    expect(
      stillOwed(run([attemptedAndFailed("de")]), LOCALES),
      "Payload logs a failure on every attempt and gives up only on the last"
    ).toEqual(["de", "fr"]);
  });

  it("reads the last word about a locale, not the first", () => {
    expect(stillOwed(run([attemptedAndFailed("de"), delivered("de")]), LOCALES)).toEqual(["fr"]);
  });

  it("owes nothing once every locale is delivered", () => {
    expect(stillOwed(run([delivered("de"), delivered("fr")]), LOCALES)).toEqual([]);
  });
});
