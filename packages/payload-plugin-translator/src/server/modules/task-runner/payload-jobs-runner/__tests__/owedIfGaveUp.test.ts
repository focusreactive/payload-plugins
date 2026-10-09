import { describe, expect, it } from "vitest";

import type { PayloadJob } from "../store/types.js";
import { owedIfGaveUp } from "../model/owedIfGaveUp.js";

const TASK = "translate-locale";

const run = (parts: Partial<PayloadJob> = {}): PayloadJob =>
  ({
    id: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    input: {
      collection_slug: "docs",
      collection_id: "doc-1",
      source_lng: "en",
      target_lngs: ["de", "fr", "es"],
      strategy: "overwrite",
    },
    ...parts,
  }) as PayloadJob;

const tried = (locale: string, totalTried: number) => ({ [TASK]: { [locale]: { totalTried } } });

const locales = (job: PayloadJob, target: string, limit: number) =>
  owedIfGaveUp(job, TASK, target, limit).map((task) => task.input.targetLng);

describe("owedIfGaveUp", () => {
  it("says nothing while the run still has an attempt left for the locale", () => {
    expect(locales(run({ taskStatus: tried("de", 1) }), "de", 3)).toEqual([]);
  });

  it("names every locale the run never reached, not just the one that threw", () => {
    expect(locales(run({ taskStatus: tried("de", 3) }), "de", 3)).toEqual(["de", "fr", "es"]);
  });

  it("leaves out a locale the run had already translated", () => {
    const job = run({
      taskStatus: tried("fr", 3),
      log: [{ state: "succeeded", input: { target_lng: "de" } }],
    } as Partial<PayloadJob>);

    expect(locales(job, "fr", 3)).toEqual(["fr", "es"]);
  });

  it("counts a locale on its first try as nothing tried yet", () => {
    expect(
      locales(run(), "de", 0),
      "no record means zero attempts before this one, which with no retries is already the last"
    ).toEqual(["de", "fr", "es"]);
  });

  it("reports when the run's own attempts are spent, although this locale has some left", () => {
    const job = run({ totalTried: 3, taskStatus: tried("de", 1) });
    expect(
      locales(job, "de", 3),
      "Payload stops a run on either counter, so a locale with budget left still never runs"
    ).toEqual(["de", "fr", "es"]);
  });

  it("reads the counter of the locale that threw, not of another one", () => {
    expect(
      locales(run({ taskStatus: tried("fr", 3) }), "de", 3),
      "fr is spent, de is on its first try — this failure is de's, so it is not final"
    ).toEqual([]);
  });
});
