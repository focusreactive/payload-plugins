import { describe, expect, it } from "vitest";

import { lastTouched, reportedRuns, statusOf } from "../runStatus.js";

import { runRow } from "./fixtures/runRecordStore.js";

const SOME_MOMENT = "2026-10-27T10:01:00.000Z";
const A_LATER_MOMENT = "2026-10-27T10:02:00.000Z";

describe("what a row of the run record means", () => {
  it("is pending while nothing has started it", () => {
    expect(statusOf(runRow())).toBe("pending");
  });

  it("is running once the plugin's handler has been called", () => {
    expect(statusOf(runRow({ startedAt: SOME_MOMENT }))).toBe("running");
  });

  it("is completed when the locale was delivered", () => {
    expect(statusOf(runRow({ outcome: "delivered", settledAt: SOME_MOMENT }))).toBe("completed");
  });

  it("is failed when the run gave up on the locale", () => {
    expect(statusOf(runRow({ outcome: "failed", settledAt: SOME_MOMENT }))).toBe("failed");
  });

  it("has no word for a cancelled locale, and says so rather than guessing", () => {
    expect(statusOf(runRow({ outcome: "cancelled", settledAt: SOME_MOMENT }))).toBeNull();
  });

  it("reads the outcome over the stamp, so a settled run is never reported as running", () => {
    const row = runRow({ startedAt: SOME_MOMENT, settledAt: SOME_MOMENT, outcome: "delivered" });

    expect(statusOf(row)).toBe("completed");
  });
});

describe("the rows a panel can speak about", () => {
  it("drops the ones with no word and keeps the rest with their status", () => {
    const kept = reportedRuns([
      runRow({ handle: "a" }),
      runRow({ handle: "b", outcome: "cancelled", settledAt: SOME_MOMENT }),
      runRow({ handle: "c", startedAt: SOME_MOMENT }),
    ]);

    expect(kept.map(({ row, status }) => [row.handle, status])).toEqual([
      ["a", "pending"],
      ["c", "running"],
    ]);
  });
});

describe("when a row was last touched", () => {
  it("answers with the settlement once there is one, not with the start it came after", () => {
    expect(
      lastTouched(
        runRow({ startedAt: SOME_MOMENT, settledAt: A_LATER_MOMENT, outcome: "delivered" })
      ),
      "the panel sorts on this, and a settled run that reports its start reads as older than it is"
    ).toBe(A_LATER_MOMENT);
  });

  it("answers with the start while the locale is still running", () => {
    expect(lastTouched(runRow({ startedAt: SOME_MOMENT }))).toBe(SOME_MOMENT);
  });

  it("falls back to when it was queued, which every row has", () => {
    const queued = runRow();

    expect(lastTouched(queued)).toBe(queued.queuedAt);
  });
});
