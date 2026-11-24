import { describe, expect, it } from "vitest";

import type { ContentState } from "../../../../../types/wire/DocumentTranslationState.js";
import type { RunState } from "../../../../../types/wire/RunState.js";
import { localeRowOf, treeModeOf } from "../localeRow.js";

const AT = "2026-11-01T09:00:00.000Z";
const base = { locales: ["de", "fr"], queuedAt: AT };

const tracked = (
  verdicts: Record<string, "current" | "drifted" | "unanswered" | "unrecorded">
): ContentState => ({ kind: "tracked", verdicts, translatedAt: AT });

const empty: ContentState = { kind: "empty" };

describe("a locale's row state", () => {
  it.each<[string, RunState, string]>([
    ["queued", { ...base, status: "queued" }, "queued"],
    ["running", { ...base, status: "running" }, "translating"],
    ["failed", { ...base, status: "failed", message: "no answer" }, "failed"],
    ["not-started", { ...base, status: "not-started", failedLocale: "de" }, "not-started"],
  ])("reads a %s run before its content", (_, run, kind) => {
    expect(localeRowOf({ content: tracked({ title: "current" }), run }).kind).toBe(kind);
  });

  it("carries what the run controls need", () => {
    expect(localeRowOf({ content: empty, run: { ...base, status: "queued" } })).toEqual({
      kind: "queued",

      locales: ["de", "fr"],
    });
    expect(
      localeRowOf({ content: empty, run: { ...base, status: "failed", message: "no answer" } })
    ).toEqual({ kind: "failed", locales: ["de", "fr"], message: "no answer" });
    expect(
      localeRowOf({ content: empty, run: { ...base, status: "not-started", failedLocale: "de" } })
    ).toEqual({ kind: "not-started", locales: ["de", "fr"], failedLocale: "de" });
    expect(
      localeRowOf({ content: empty, run: { ...base, status: "running" } }),
      "a run in flight carries its locales too, or its row can offer no way to stop it"
    ).toEqual({ kind: "translating", startedAt: AT, locales: ["de", "fr"] });
  });

  it("reads an empty locale as not translated", () => {
    expect(localeRowOf({ content: empty, run: null })).toEqual({ kind: "not-translated" });
  });

  it("never folds a locale written by hand into not translated", () => {
    expect(localeRowOf({ content: { kind: "untracked" }, run: null })).toEqual({
      kind: "written-by-hand",
    });
  });

  it("reads content without records, as with provenance off, as translated", () => {
    expect(localeRowOf({ content: { kind: "filled" }, run: null })).toEqual({ kind: "translated" });
  });

  it("reads a tracked locale with every leaf current as up to date", () => {
    expect(localeRowOf({ content: tracked({ a: "current", b: "current" }), run: null })).toEqual({
      kind: "up-to-date",
      translatedAt: AT,
    });
  });

  it("counts drifted and unrecorded leaves as behind and unanswered ones as come back empty", () => {
    const content = tracked({
      a: "drifted",
      b: "unrecorded",
      c: "unanswered",
      d: "unanswered",
      e: "current",
    });
    expect(localeRowOf({ content, run: null })).toEqual({
      kind: "behind",
      behind: 2,
      cameBackEmpty: 2,
      translatedAt: AT,
    });
  });
});

describe("which rows open, and how", () => {
  it("opens a locale that holds content for picking, whoever wrote it", () => {
    expect(treeModeOf({ kind: "up-to-date", translatedAt: AT })).toBe("pick");
    expect(treeModeOf({ kind: "behind", behind: 1, cameBackEmpty: 0, translatedAt: AT })).toBe(
      "pick"
    );
    expect(treeModeOf({ kind: "written-by-hand" })).toBe("pick");
    expect(treeModeOf({ kind: "translated" })).toBe("pick");
  });

  it("offers a locale that holds nothing as a whole, since a part of it would not save", () => {
    expect(treeModeOf({ kind: "not-translated" })).toBe("whole");
  });

  it.each([
    { kind: "translating" as const, startedAt: AT, locales: ["de"] },
    { kind: "queued" as const, locales: ["de"] },
    { kind: "failed" as const, locales: ["de"], message: "no answer" },
    { kind: "not-started" as const, locales: ["de"], failedLocale: "de" },
  ])("does not open a $kind row, which is about its run and not its content", (row) => {
    expect(treeModeOf(row)).toBeNull();
  });
});
