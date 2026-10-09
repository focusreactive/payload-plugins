import { describe, it, expect } from "vitest";

import { owedOnCancel } from "../owedOnCancel.js";
import type { PayloadJob } from "../types.js";

const run = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
  id: 7,
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:01:00Z",
  input: {
    collection_slug: "posts",
    collection_id: "doc-1",
    source_lng: "en",
    target_lngs: ["de", "fr"],
    strategy: "overwrite",
    publish_on_translation: false,
  },
  ...overrides,
});

describe("owedOnCancel", () => {
  it("owes every locale of a run that has not started", () => {
    expect(owedOnCancel(run()).map((task) => task.input.targetLng)).toEqual(["de", "fr"]);
  });

  it("owes a locale whose attempt failed while the run can still try again", () => {
    const betweenAttempts = run({
      error: { message: "provider down" },
      log: [{ state: "failed", input: { target_lng: "de" } }],
    });

    expect(owedOnCancel(betweenAttempts).map((task) => task.input.targetLng)).toEqual(["de", "fr"]);
  });

  it("does not owe a locale the run delivered", () => {
    const halfDone = run({
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:01:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(owedOnCancel(halfDone).map((task) => task.input.targetLng)).toEqual(["fr"]);
  });

  it("owes nothing once the run has given up", () => {
    const spent = run({
      hasError: true,
      error: { message: "provider down" },
      log: [{ state: "failed", input: { target_lng: "de" } }],
    });

    expect(
      owedOnCancel(spent),
      "giving up settled every locale it had not delivered; a second ending is one too many"
    ).toEqual([]);
  });
});
