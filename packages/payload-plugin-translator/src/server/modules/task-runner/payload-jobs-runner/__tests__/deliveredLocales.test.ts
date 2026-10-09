import { describe, it, expect } from "vitest";

import { deliveredLocales } from "../model/deliveredLocales.js";
import type { PayloadJob } from "../store/index.js";

const jobWith = (log: PayloadJob["log"]): PayloadJob => ({
  id: 1,
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:01:00Z",
  log,
  input: { collection_slug: "docs", collection_id: "1", target_lngs: ["de", "fr", "es"] },
});

describe("deliveredLocales", () => {
  it("holds a locale whose latest entry succeeded", () => {
    const delivered = deliveredLocales(
      jobWith([{ state: "succeeded", input: { target_lng: "de" } }])
    );

    expect([...delivered]).toEqual(["de"]);
  });

  it("leaves out a locale whose latest entry failed", () => {
    const delivered = deliveredLocales(jobWith([{ state: "failed", input: { target_lng: "fr" } }]));

    expect([...delivered]).toEqual([]);
  });

  it("leaves out a locale that has not run", () => {
    expect([...deliveredLocales(jobWith([]))]).toEqual([]);
  });

  it("follows the latest entry when a locale ran more than once", () => {
    const retried = jobWith([
      { state: "failed", input: { target_lng: "de" } },
      { state: "succeeded", input: { target_lng: "de" } },
    ]);

    expect([...deliveredLocales(retried)], "the last attempt is the one that counts").toEqual([
      "de",
    ]);
  });
});
