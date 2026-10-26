import { describe, it, expect } from "vitest";

import { normalizeJobLocales } from "../store/normalizeJob.js";
import type { PayloadJob } from "../store/types.js";

type StoredInput = NonNullable<PayloadJob["input"]>;

const inputOf = (locales: Partial<StoredInput>): StoredInput => ({
  collection_slug: "posts",
  collection_id: "doc-1",
  source_lng: "en",
  publish_on_translation: false,
  ...locales,
});

const run = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
  id: 7,
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:01:00Z",
  input: inputOf({ targets: [{ lng: "de", filters: [] }] }),
  ...overrides,
});

describe("normalizeJobLocales", () => {
  it("gives a run one row per entry of its locale list, in that order", () => {
    const threeLocales = run({
      input: inputOf({
        targets: [
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
          { lng: "es", filters: [] },
        ],
      }),
    });

    expect(normalizeJobLocales(threeLocales).map((task) => task.input.targetLng)).toEqual([
      "de",
      "fr",
      "es",
    ]);
  });

  it("reproduces a repeated locale as two rows", () => {
    const repeated = run({
      input: inputOf({
        targets: [
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
          { lng: "de", filters: [] },
        ],
      }),
    });

    expect(
      normalizeJobLocales(repeated).map((task) => task.input.targetLng),
      "the caller decides whether a repeated locale is a mistake"
    ).toEqual(["de", "fr", "de"]);
  });

  it("gives a job with no locale list one row for the single locale it carries", () => {
    const beforeLists = run({ input: inputOf({ target_lng: "de" }) });

    expect(normalizeJobLocales(beforeLists).map((task) => task.input.targetLng)).toEqual(["de"]);
  });

  it("gives a job with an empty locale list one row for the single locale it carries", () => {
    const emptyList = run({ input: inputOf({ targets: [], target_lng: "de" }) });

    expect(normalizeJobLocales(emptyList).map((task) => task.input.targetLng)).toEqual(["de"]);
  });

  it("completes a locale whose own latest entry succeeded, although the run failed", () => {
    const succeededInsideCancelledRun = run({
      error: { message: "provider down" },
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(succeededInsideCancelledRun).map((task) => task.status)).toEqual([
      "completed",
    ]);
  });

  it("dates a completed locale by its own entry, not by the run", () => {
    const runFinishedLater = run({
      completedAt: "2026-10-09T10:09:00Z",
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(runFinishedLater).map((task) => task.completedAt)).toEqual([
      "2026-10-09T10:05:00Z",
    ]);
  });

  it("leaves a completed locale without an error, although the run carries one", () => {
    const succeededInsideCancelledRun = run({
      error: { message: "provider down" },
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(succeededInsideCancelledRun).map((task) => task.error)).toEqual([
      undefined,
    ]);
  });

  it("leaves a completed locale uncancelled, although the run was cancelled", () => {
    const succeededInsideCancelledRun = run({
      error: { cancelled: true },
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(succeededInsideCancelledRun).map((task) => task.cancelled)).toEqual([
      false,
    ]);
  });

  it("reports a locale whose latest entry failed as the run stands, not as the entry does", () => {
    const stillRetrying = run({
      processing: true,
      log: [{ state: "failed", input: { target_lng: "de" } }],
    });

    expect(
      normalizeJobLocales(stillRetrying).map((task) => task.status),
      "the queue appends a failed entry on every attempt and gives up only once"
    ).toEqual(["running"]);
  });

  it("takes a locale's latest entry over its earlier attempt", () => {
    const succeededOnRetry = run({
      processing: true,
      log: [
        { state: "failed", input: { target_lng: "de" } },
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(succeededOnRetry).map((task) => task.status)).toEqual(["completed"]);
  });

  it("does not complete a locale whose latest entry failed after an earlier success", () => {
    const failedAfterSuccess = run({
      processing: true,
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "de" } },
        { state: "failed", input: { target_lng: "de" } },
      ],
    });

    expect(normalizeJobLocales(failedAfterSuccess).map((task) => task.status)).toEqual(["running"]);
  });

  it("reports a locale with no entry of its own as the run stands", () => {
    const anotherLocaleSettled = run({
      processing: true,
      log: [
        { state: "succeeded", completedAt: "2026-10-09T10:05:00Z", input: { target_lng: "fr" } },
      ],
    });

    expect(normalizeJobLocales(anotherLocaleSettled).map((task) => task.status)).toEqual([
      "running",
    ]);
  });

  it("gives every row of one run the same id", () => {
    const threeLocales = run({
      input: inputOf({
        targets: [
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
          { lng: "es", filters: [] },
        ],
      }),
    });
    const ids = normalizeJobLocales(threeLocales).map((task) => task.id);

    expect(new Set(ids).size).toBe(1);
  });

  it("reads a run with a completedAt as completed", () => {
    const finished = run({ completedAt: "2026-10-09T10:09:00Z" });

    expect(normalizeJobLocales(finished).map((task) => task.status)).toEqual(["completed"]);
  });

  it("reads a run that is processing as running", () => {
    const inFlight = run({ processing: true });

    expect(normalizeJobLocales(inFlight).map((task) => task.status)).toEqual(["running"]);
  });

  it("reads a run the queue has given up on as failed", () => {
    const broken = run({ error: { message: "provider down" }, hasError: true });

    expect(normalizeJobLocales(broken).map((task) => task.status)).toEqual(["failed"]);
  });

  it("reads a run that failed an attempt but will retry as pending", () => {
    const retrying = run({ error: { message: "provider down" } });

    expect(
      normalizeJobLocales(retrying).map((task) => task.status),
      "Payload stores an error on every attempt and sets hasError only once it stops retrying"
    ).toEqual(["pending"]);
  });

  it("reads a run with no completedAt, no processing and no error as pending", () => {
    expect(normalizeJobLocales(run()).map((task) => task.status)).toEqual(["pending"]);
  });

  it("reads a run as completed even though it is also processing and carries an error", () => {
    const finishedAfterTrouble = run({
      completedAt: "2026-10-09T10:09:00Z",
      processing: true,
      error: { message: "provider down" },
    });

    expect(normalizeJobLocales(finishedAfterTrouble).map((task) => task.status)).toEqual([
      "completed",
    ]);
  });

  it("reads a run as running even though it also carries an error", () => {
    const retryingAfterTrouble = run({ processing: true, error: { message: "provider down" } });

    expect(normalizeJobLocales(retryingAfterTrouble).map((task) => task.status)).toEqual([
      "running",
    ]);
  });
});
