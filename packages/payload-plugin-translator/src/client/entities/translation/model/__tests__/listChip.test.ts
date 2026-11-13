import { describe, expect, it } from "vitest";

import type { ListLocaleState } from "../../../../../types/wire/ListTranslationState.js";
import type { RunState } from "../../../../../types/wire/RunState.js";
import { listChipOf } from "../listChip.js";

const AT = "2026-11-01T09:00:00.000Z";
const run = { handle: "h1", locales: ["de"], queuedAt: AT };
const filled = { kind: "filled", translatedAt: AT } as const;
const empty = { kind: "empty" } as const;

const state = (
  content: ListLocaleState["content"],
  runState: RunState | null = null
): ListLocaleState => ({ locale: "de", content, run: runState });

describe("a locale's mark in the list column", () => {
  it("reads translated, with when, for a filled locale with no run", () => {
    expect(listChipOf(state(filled))).toEqual({
      kind: "translated",
      locale: "de",
      translatedAt: AT,
    });
  });

  it("reads translated with no date when the server knows none", () => {
    expect(listChipOf(state({ kind: "filled", translatedAt: null }))).toEqual({
      kind: "translated",
      locale: "de",
      translatedAt: null,
    });
  });

  it("reads not translated for an empty locale", () => {
    expect(listChipOf(state(empty))).toEqual({ kind: "not-translated", locale: "de" });
  });

  it("reads queued for a queued run, whatever the locale holds", () => {
    expect(listChipOf(state(filled, { status: "queued", ...run }))).toEqual({
      kind: "queued",
      locale: "de",
    });
  });

  it("reads translating for a running run", () => {
    expect(listChipOf(state(empty, { status: "running", ...run }))).toEqual({
      kind: "translating",
      locale: "de",
    });
  });

  it("reads failed, with the run's message", () => {
    expect(listChipOf(state(filled, { status: "failed", message: "quota", ...run }))).toEqual({
      kind: "failed",
      locale: "de",
      message: "quota",
    });
  });

  it("reads failed for a locale that never started because another failed first", () => {
    expect(listChipOf(state(empty, { status: "not-started", failedLocale: "fr", ...run }))).toEqual(
      {
        kind: "failed",
        locale: "de",
        message: "Not started: fr failed first",
      }
    );
  });
});
