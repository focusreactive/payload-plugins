import { describe, expect, it } from "vitest";

import type { LocaleState } from "../../../../../types/wire/DocumentTranslationState.js";
import { documentPanelStatus, hasLiveRun } from "../documentPanelStatus.js";

const AT = "2026-11-01T09:00:00.000Z";
const run = { locales: ["de"], queuedAt: AT };

const locale = (overrides: Partial<LocaleState>): LocaleState => ({
  locale: "de",
  content: { kind: "empty" },
  run: null,
  ...overrides,
});

const upToDate = locale({
  locale: "de",
  content: { kind: "tracked", verdicts: { a: "current" }, translatedAt: AT },
});
const behind = locale({
  locale: "fr",
  content: { kind: "tracked", verdicts: { a: "drifted" }, translatedAt: AT },
});
const queued = locale({ locale: "es", run: { ...run, status: "queued" } });
const failed = locale({ locale: "it", run: { ...run, status: "failed", message: "x" } });
const notStarted = locale({
  locale: "pl",
  run: { ...run, status: "not-started", failedLocale: "it" },
});

describe("the document's aggregate dot", () => {
  it("shows a failure above everything", () => {
    expect(documentPanelStatus([upToDate, behind, queued, failed])).toEqual({ kind: "failed" });
  });

  it("counts a locale the run never reached as a failure", () => {
    expect(documentPanelStatus([upToDate, notStarted])).toEqual({ kind: "failed" });
  });

  it("shows work in flight above a locale behind", () => {
    expect(documentPanelStatus([behind, queued])).toEqual({ kind: "running" });
  });

  it("names the locales behind", () => {
    expect(documentPanelStatus([upToDate, behind])).toEqual({
      kind: "stale",
      staleLocales: ["fr"],
    });
  });

  it("shows fresh when something is translated and nothing is behind", () => {
    expect(documentPanelStatus([upToDate, locale({ locale: "es" })])).toEqual({ kind: "fresh" });
    expect(documentPanelStatus([locale({ content: { kind: "filled" } })])).toEqual({
      kind: "fresh",
    });
  });

  it("shows nothing for a document never translated", () => {
    expect(documentPanelStatus([locale({}), locale({ content: { kind: "untracked" } })])).toEqual({
      kind: "none",
    });
    expect(documentPanelStatus([])).toEqual({ kind: "none" });
  });
});

describe("a live run", () => {
  it("is a queued or running run on any locale", () => {
    expect(hasLiveRun([upToDate, queued])).toBe(true);
    expect(hasLiveRun([locale({ run: { ...run, status: "running" } })])).toBe(true);
  });

  it("is not a failed or not-started run", () => {
    expect(hasLiveRun([failed, notStarted, upToDate])).toBe(false);
  });
});
