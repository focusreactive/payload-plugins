import { describe, it, expect } from "vitest";

import { resolveTargetLocales } from "./resolveTargetLocales";

const known = new Set(["en", "de", "fr", "es"]);

describe("resolveTargetLocales", () => {
  it("coerces a scalar target to a single-element list (back-compat)", () => {
    const r = resolveTargetLocales({ target_lng: "de", source_lng: "en", knownLocales: known });
    expect(r.targets).toEqual(["de"]);
    expect(r.droppedUnknown).toEqual([]);
    expect(r.droppedSource).toBe(false);
  });

  it("keeps multiple targets in first-seen order", () => {
    const r = resolveTargetLocales({
      target_lng: ["fr", "de"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["fr", "de"]);
  });

  it("de-dups duplicate targets to one per locale (AC5)", () => {
    const r = resolveTargetLocales({
      target_lng: ["de", "de", "fr"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de", "fr"]);
  });

  it("excludes the source locale from targets (AC6)", () => {
    const r = resolveTargetLocales({
      target_lng: ["en", "de"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de"]);
    expect(r.droppedSource).toBe(true);
  });

  it("drops unknown locales and reports them, keeping valid targets (AC4)", () => {
    const r = resolveTargetLocales({
      target_lng: ["de", "xx", "fr"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual(["de", "fr"]);
    expect(r.droppedUnknown).toEqual(["xx"]);
  });

  it("keeps every non-source target unfiltered when localization is unknown/disabled", () => {
    const r = resolveTargetLocales({
      target_lng: ["de", "xx"],
      source_lng: "en",
      knownLocales: null,
    });
    expect(r.targets).toEqual(["de", "xx"]);
    expect(r.droppedUnknown).toEqual([]);
  });

  it("returns no targets when every requested locale is the source or unknown", () => {
    const r = resolveTargetLocales({
      target_lng: ["en", "xx"],
      source_lng: "en",
      knownLocales: known,
    });
    expect(r.targets).toEqual([]);
    expect(r.droppedSource).toBe(true);
    expect(r.droppedUnknown).toEqual(["xx"]);
  });
});
