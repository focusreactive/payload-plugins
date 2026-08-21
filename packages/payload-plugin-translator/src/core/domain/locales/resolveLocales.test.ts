import { describe, it, expect } from "vitest";

import * as Locales from "./resolveLocales";

describe("Locales.isKnown", () => {
  const known = new Set(["en", "de", "fr"]);

  it("is true for a configured locale, false otherwise", () => {
    expect(Locales.isKnown("de", known)).toBe(true);
    expect(Locales.isKnown("xx", known)).toBe(false);
  });

  it("is false against an empty set", () => {
    expect(Locales.isKnown("de", new Set())).toBe(false);
  });
});

describe("Locales.dedupe", () => {
  it("removes duplicates, preserving first-seen order", () => {
    expect(Locales.dedupe(["de", "fr", "de", "en", "fr"])).toEqual(["de", "fr", "en"]);
  });

  it("returns an empty list unchanged", () => {
    expect(Locales.dedupe([])).toEqual([]);
  });

  it("leaves an already-unique list unchanged", () => {
    expect(Locales.dedupe(["de", "fr", "en"])).toEqual(["de", "fr", "en"]);
  });
});

describe("Locales.dropUnknown", () => {
  const known = new Set(["en", "de", "fr"]);

  it("splits into kept/dropped, preserving order within each", () => {
    expect(Locales.dropUnknown(["de", "xx", "fr", "yy"], known)).toEqual({
      kept: ["de", "fr"],
      dropped: ["xx", "yy"],
    });
  });

  it("keeps everything when all locales are configured", () => {
    expect(Locales.dropUnknown(["de", "fr"], known)).toEqual({ kept: ["de", "fr"], dropped: [] });
  });

  it("drops everything when no locale is configured", () => {
    expect(Locales.dropUnknown(["xx", "yy"], known)).toEqual({ kept: [], dropped: ["xx", "yy"] });
  });
});

describe("Locales.excludeSource", () => {
  it("removes the source and reports it was present", () => {
    expect(Locales.excludeSource(["en", "de", "fr"], "en")).toEqual({
      kept: ["de", "fr"],
      wasPresent: true,
    });
  });

  it("leaves the list unchanged and reports absent when the source is not a target", () => {
    expect(Locales.excludeSource(["de", "fr"], "en")).toEqual({
      kept: ["de", "fr"],
      wasPresent: false,
    });
  });

  it("removes every occurrence of the source", () => {
    expect(Locales.excludeSource(["en", "de", "en"], "en")).toEqual({
      kept: ["de"],
      wasPresent: true,
    });
  });
});

describe("Locales.resolveTargets (composed manual-enqueue resolution)", () => {
  const known = new Set(["en", "de", "fr", "es"]);

  it("coerces a scalar target to a single-element list", () => {
    expect(
      Locales.resolveTargets({ target_lng: "de", source_lng: "en", knownLocales: known })
    ).toEqual({ targets: ["de"], droppedUnknown: [], droppedSource: false });
  });

  it("keeps multiple targets in first-seen order", () => {
    const r = Locales.resolveTargets({
      target_lng: ["fr", "de"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["fr", "de"]);
  });

  it("de-dups duplicate targets to one per locale", () => {
    const r = Locales.resolveTargets({
      target_lng: ["de", "de", "fr"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de", "fr"]);
  });

  it("excludes the source locale and flags droppedSource", () => {
    const r = Locales.resolveTargets({
      target_lng: ["en", "de"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de"]);
    expect(r.droppedSource).toBe(true);
  });

  it("drops unknown locales and reports them, keeping valid targets", () => {
    const r = Locales.resolveTargets({
      target_lng: ["de", "xx", "fr"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de", "fr"]);
    expect(r.droppedUnknown).toEqual(["xx"]);
  });

  it("returns no targets when every requested locale is the source or unknown", () => {
    const r = Locales.resolveTargets({
      target_lng: ["en", "xx"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual([]);
    expect(r.droppedSource).toBe(true);
    expect(r.droppedUnknown).toEqual(["xx"]);
  });
});
