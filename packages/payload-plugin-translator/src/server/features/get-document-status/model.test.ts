import { describe, it, expect } from "vitest";

import { reportedRuns } from "../../modules/runs/index.js";
import { runRow } from "../../modules/runs/__tests__/fixtures/runRecordStore.js";

import { latestPerTargetLocale } from "./model.js";

const runs = (...rows: ReturnType<typeof runRow>[]) => reportedRuns(rows);

describe("latestPerTargetLocale", () => {
  it("returns one run per target locale", () => {
    const kept = latestPerTargetLocale(
      runs(runRow({ handle: "de", targetLng: "de" }), runRow({ handle: "fr", targetLng: "fr" }))
    );

    expect(kept.map(({ row }) => row.targetLng).sort()).toEqual(["de", "fr"]);
  });

  it("keeps the run queued most recently for a locale", () => {
    const kept = latestPerTargetLocale(
      runs(
        runRow({ handle: "old", queuedAt: "2026-10-01T00:00:00.000Z" }),
        runRow({ handle: "new", queuedAt: "2026-10-02T00:00:00.000Z" })
      )
    );

    expect(kept).toHaveLength(1);
    expect(kept[0].row.handle).toBe("new");
  });

  it("breaks a tie on when the locale was last touched", () => {
    const sameMoment = "2026-10-01T00:00:00.000Z";
    const kept = latestPerTargetLocale(
      runs(
        runRow({ handle: "stale", queuedAt: sameMoment }),
        runRow({ handle: "fresh", queuedAt: sameMoment, startedAt: "2026-10-01T06:00:00.000Z" })
      )
    );

    expect(kept).toHaveLength(1);
    expect(kept[0].row.handle).toBe("fresh");
  });

  it("answers with nothing when nothing has run", () => {
    expect(latestPerTargetLocale([])).toEqual([]);
  });
});
