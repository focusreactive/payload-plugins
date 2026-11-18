import { describe, expect, it } from "vitest";

import type { ContentState } from "../../../../../types/wire/DocumentTranslationState.js";
import type { RunState } from "../../../../../types/wire/RunState.js";
import { localeRowOf, treeModeOf } from "../localeRow.js";

const AT = "2026-11-01T09:00:00.000Z";
const base = { locales: ["de", "fr"], queuedAt: AT };

const tracked = (
  verdicts: Record<string, "current" | "drifted" | "unanswered" | "unrecorded">,
  dismissed = false
): ContentState => ({ kind: "tracked", verdicts, translatedAt: AT, dismissed });

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
    expect(localeRowOf({ content: empty, run: { ...base, status: "running" } })).toEqual({
      kind: "translating",
      startedAt: AT,
    });
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

  it("reads a dismissed locale as up to date", () => {
    expect(localeRowOf({ content: tracked({ a: "drifted" }, true), run: null })).toEqual({
      kind: "up-to-date",
      translatedAt: AT,
    });
  });
});

describe("which rows open, and how", () => {
  it("opens a tracked locale for picking fields", () => {
    expect(treeModeOf({ kind: "up-to-date", translatedAt: AT }, true)).toBe("pick");
    expect(
      treeModeOf({ kind: "behind", behind: 1, cameBackEmpty: 0, translatedAt: AT }, true)
    ).toBe("pick");
  });

  it("opens an empty locale as a whole, but only where records are kept", () => {
    expect(treeModeOf({ kind: "not-translated" }, true)).toBe("whole");
    expect(treeModeOf({ kind: "not-translated" }, false)).toBeNull();
  });

  it.each([
    { kind: "written-by-hand" as const },
    { kind: "translated" as const },
    { kind: "translating" as const, startedAt: AT },
    { kind: "queued" as const, locales: ["de"] },
  ])("does not open a $kind row", (row) => {
    expect(treeModeOf(row, true)).toBeNull();
  });
});
