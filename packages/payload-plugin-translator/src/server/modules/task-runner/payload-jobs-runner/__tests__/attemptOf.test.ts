import { describe, it, expect } from "vitest";

import { attemptOf } from "../PayloadJobsRunnerProvider.js";

const SLUG = "translate_document";

const job = (status: Record<string, { totalTried?: unknown }>) => ({
  workflowSlug: "translate_document_locales",
  taskStatus: { [SLUG]: status },
});

describe("attemptOf — which attempt of this locale the handler is running", () => {
  it.each([
    ["tried once", 1, 2],
    ["tried twice", 2, 3],
  ])("reads a locale %s as attempt %i + 1", (_label, totalTried, expected) => {
    expect(attemptOf(job({ de: { totalTried } }), SLUG, "de")).toBe(expected);
  });

  it("reads a locale with no status entry as its first attempt", () => {
    expect(attemptOf(job({}), SLUG, "de")).toBe(1);
  });

  it("counts the locale's own attempts, not the job's", () => {
    expect(
      attemptOf(job({ de: { totalTried: 2 } }), SLUG, "fr"),
      "one job carries every locale, and fr has not run yet — the job's two passes were de's"
    ).toBe(1);
  });

  it("reads a job that is the task itself under the id Payload runs it with", () => {
    expect(
      attemptOf({ taskStatus: { [SLUG]: { "1": { totalTried: 1 } } } }, SLUG, "de"),
      "a pre-workflow row has no workflow and no locale key"
    ).toBe(2);
  });

  it("says nothing when there is no job to read", () => {
    expect(attemptOf(undefined, SLUG, "de")).toBeUndefined();
  });

  it("says nothing rather than guessing when the count is not a number", () => {
    expect(attemptOf(job({ de: { totalTried: "2" } }), SLUG, "de")).toBeUndefined();
  });
});
