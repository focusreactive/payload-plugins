import { describe, it, expect } from "vitest";
import type { Task, TaskInput } from "../task-runner/types.js";
import { stillOwed } from "./stillOwed.js";

const RUN_ID = "run-1";

const localeOf = (targetLng: string): TaskInput => ({
  collectionSlug: "posts",
  collectionId: "doc-1",
  sourceLng: "en",
  targetLng,
  strategy: "overwrite",
  publishOnTranslation: false,
});

const delivered = (targetLng: string): Task => ({
  id: RUN_ID,
  status: "completed",
  input: localeOf(targetLng),
  createdAt: "2026-10-06T10:00:00Z",
  updatedAt: "2026-10-06T10:01:00Z",
  completedAt: "2026-10-06T10:01:00Z",
  cancelled: false,
});

const attemptedAndFailed = (targetLng: string): Task => ({
  id: RUN_ID,
  status: "failed",
  input: localeOf(targetLng),
  createdAt: "2026-10-06T10:00:00Z",
  updatedAt: "2026-10-06T10:02:00Z",
  error: { message: "provider unreachable" },
  cancelled: false,
});

const neverStarted = (targetLng: string): Task => ({
  id: RUN_ID,
  status: "pending",
  input: localeOf(targetLng),
  createdAt: "2026-10-06T10:00:00Z",
  updatedAt: "2026-10-06T10:00:00Z",
  cancelled: false,
});

describe("stillOwed", () => {
  it("owes nothing when every locale was delivered", () => {
    expect(stillOwed([delivered("de"), delivered("fr")])).toEqual([]);
  });

  it("owes a locale that was attempted and failed", () => {
    const failedFr = attemptedAndFailed("fr");

    expect(stillOwed([delivered("de"), failedFr])).toContainEqual(failedFr);
  });

  it("owes a locale the run was translating when it stopped", () => {
    const owed = stillOwed([{ ...neverStarted("de"), status: "running" }]);
    expect(owed.map((task) => task.input.targetLng)).toEqual(["de"]);
  });

  it("owes a locale the run never reached", () => {
    const pendingEs = neverStarted("es");

    expect(stillOwed([delivered("de"), attemptedAndFailed("fr"), pendingEs])).toContainEqual(
      pendingEs
    );
  });

  it("does not announce a delivered locale, even though the run ended badly", () => {
    const deliveredDe = delivered("de");

    expect(
      stillOwed([deliveredDe, attemptedAndFailed("fr"), neverStarted("es")])
    ).not.toContainEqual(deliveredDe);
  });

  it("owes each locale separately, although the run's locales share one id", () => {
    expect(stillOwed([attemptedAndFailed("fr"), attemptedAndFailed("es")])).toHaveLength(2);
  });

  it("orders the owed locales the way the run would have translated them", () => {
    const owed = stillOwed([neverStarted("es"), delivered("de"), attemptedAndFailed("fr")]);

    expect(owed.map((task) => task.input.targetLng)).toEqual(["es", "fr"]);
  });

  it("hands back the task itself, not a locale name or a runner's row", () => {
    const failedFr = attemptedAndFailed("fr");

    expect(stillOwed([failedFr])).toEqual([failedFr]);
  });

  it("owes nothing for a run that covered nothing", () => {
    expect(stillOwed([])).toEqual([]);
  });
});
