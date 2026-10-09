import { describe, it, expect } from "vitest";

import { localesAsTheyStand } from "../model/localesAsTheyStand.js";

const runOf = (targets: string[]) => ({
  input: {
    collection_slug: "docs",
    collection_id: "1",
    source_lng: "en",
    strategy: "overwrite",
    target_lngs: targets,
  },
});

describe("localesAsTheyStand", () => {
  it("yields every locale the run lists, in order", () => {
    const yielded = [...localesAsTheyStand(runOf(["de", "fr", "es"]))].map((run) => run.target);

    expect(yielded).toEqual(["de", "fr", "es"]);
  });

  it("yields nothing when the run lists none", () => {
    expect([...localesAsTheyStand({ input: {} })]).toEqual([]);
  });

  it("yields a locale appended after the walk began", () => {
    const job = runOf(["de"]);
    const walk = localesAsTheyStand(job);

    expect(walk.next().value?.target).toBe("de");
    job.input.target_lngs.push("fr");

    expect(
      walk.next().value?.target,
      "a second request appends to the row of a run already in flight"
    ).toBe("fr");
  });

  it("yields a locale once even when the run lists it twice", () => {
    // Nothing in the plugin writes a duplicate — planEnqueue and extendJob both de-duplicate — but
    // the row is a json column, and a run that translated one locale twice would announce it twice.
    const yielded = [...localesAsTheyStand(runOf(["de", "fr", "de"]))].map((run) => run.target);

    expect(yielded).toEqual(["de", "fr"]);
  });

  it("hands each task the run's shared fields and its own locale", () => {
    const [first] = [...localesAsTheyStand(runOf(["de"]))];

    expect(first?.input).toEqual({
      collection_slug: "docs",
      collection_id: "1",
      source_lng: "en",
      strategy: "overwrite",
      target_lng: "de",
    });
  });

  it("does not hand a task the whole locale list", () => {
    const [first] = [...localesAsTheyStand(runOf(["de", "fr"]))];

    expect(
      first?.input,
      "a task translates one locale and must not see the run's list"
    ).not.toHaveProperty("target_lngs");
  });
});
