import { describe, expect, it } from "vitest";

import { markFailureReason } from "../../../../core/errors/failureReason.js";
import { GENERIC_TRANSLATION_ERROR } from "../../../shared/http/index.js";
import { reportedRuns } from "../runStatus.js";
import { runStateOf } from "../runStateOf.js";

import { runRow } from "./fixtures/runRecordStore.js";

const QUEUED_AT = "2026-10-27T10:00:00.000Z";
const STARTED_AT = "2026-10-27T10:01:00.000Z";
const SETTLED_AT = "2026-10-27T10:02:00.000Z";
const LATER = "2026-10-27T10:03:00.000Z";

const LOCALES = ["en", "de", "fr", "es"];

const stateOf = (rows: Parameters<typeof reportedRuns>[0], locale: string) =>
  runStateOf({ runs: reportedRuns(rows), locale, configuredLocales: LOCALES });

describe("the run a locale is waiting on", () => {
  it("has nothing to say about a locale no run touched", () => {
    expect(stateOf([runRow({ targetLng: "de" })], "fr")).toBeNull();
  });

  it("says queued while nothing has started it", () => {
    expect(stateOf([runRow()], "de")).toStrictEqual({
      status: "queued",
      locales: ["de"],
      queuedAt: QUEUED_AT,
    });
  });

  it("says running once it has started", () => {
    expect(stateOf([runRow({ startedAt: STARTED_AT })], "de")).toMatchObject({
      status: "running",
    });
  });

  it("has nothing to say about a locale whose last run delivered it", () => {
    expect(stateOf([runRow({ outcome: "delivered", settledAt: SETTLED_AT })], "de")).toBeNull();
  });

  it("falls back to the last run that said something where the newest was cancelled", () => {
    const rows = [
      runRow({ handle: "run-1", outcome: "failed", settledAt: SETTLED_AT, error: "no answer" }),
      runRow({ handle: "run-2", queuedAt: LATER, outcome: "cancelled", settledAt: LATER }),
    ];

    expect(stateOf(rows, "de")).toMatchObject({ status: "failed" });
  });

  it("names every locale the run covers, in the project's order", () => {
    const rows = [
      runRow({ targetLng: "es" }),
      runRow({ targetLng: "de" }),
      runRow({ targetLng: "fr" }),
      runRow({ handle: "other", targetLng: "en" }),
    ];

    expect(stateOf(rows, "de")?.locales).toStrictEqual(["de", "fr", "es"]);
  });

  it("names a locale the project no longer configures after the ones it does", () => {
    const rows = [runRow({ targetLng: "de" }), runRow({ targetLng: "zz" })];

    expect(stateOf(rows, "de")?.locales).toStrictEqual(["de", "zz"]);
  });
});

describe("a run that failed", () => {
  it("carries the re-authored text of a named reason, not the detail stored beside it", () => {
    const stored = markFailureReason("service-no-answer", "upstream timeout at 10.0.0.3:443");
    const rows = [runRow({ outcome: "failed", settledAt: SETTLED_AT, error: stored })];

    const message = (stateOf(rows, "de") as { message: string }).message;
    expect(message).toBe("The translation service did not respond. Try again in a moment.");
    expect(message).not.toContain("10.0.0.3");
  });

  it("says the generic line where the row kept no reason at all", () => {
    const rows = [runRow({ outcome: "failed", settledAt: SETTLED_AT, error: null })];

    expect(stateOf(rows, "de")).toMatchObject({ message: GENERIC_TRANSLATION_ERROR });
  });
});

describe("a locale abandoned because a sibling failed", () => {
  const abandoned = runRow({ targetLng: "fr", outcome: "abandoned", settledAt: LATER });

  it("says not started, and names the sibling that failed", () => {
    const rows = [
      abandoned,
      runRow({ targetLng: "de", outcome: "failed", settledAt: SETTLED_AT, error: "no answer" }),
    ];

    expect(stateOf(rows, "fr")).toStrictEqual({
      status: "not-started",
      locales: ["de", "fr"],
      queuedAt: QUEUED_AT,
      failedLocale: "de",
    });
  });

  it("names the sibling that failed first, and the same one on every poll", () => {
    const rows = [
      abandoned,
      runRow({ targetLng: "de", outcome: "failed", settledAt: LATER, error: "late" }),
      runRow({ targetLng: "es", outcome: "failed", settledAt: SETTLED_AT, error: "early" }),
    ];

    expect(stateOf(rows, "fr")).toMatchObject({ failedLocale: "es" });
  });

  it("breaks a tie by locale code, so two polls agree", () => {
    const rows = [
      abandoned,
      runRow({ targetLng: "es", outcome: "failed", settledAt: SETTLED_AT, error: "one" }),
      runRow({ targetLng: "de", outcome: "failed", settledAt: SETTLED_AT, error: "two" }),
    ];

    expect(stateOf(rows, "fr")).toMatchObject({ failedLocale: "de" });
  });

  it("reports itself as failed where no sibling failed, since the wire has no other word", () => {
    const rows = [
      runRow({ targetLng: "fr", outcome: "abandoned", settledAt: LATER, error: "gave up" }),
      runRow({ targetLng: "de", outcome: "delivered", settledAt: SETTLED_AT }),
    ];

    expect(stateOf(rows, "fr")).toMatchObject({ status: "failed" });
  });
});
