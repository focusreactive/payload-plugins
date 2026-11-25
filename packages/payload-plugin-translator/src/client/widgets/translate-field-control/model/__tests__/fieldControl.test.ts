import { describe, expect, it } from "vitest";

import type { FieldTranslationNotice } from "../../../../../types/wire/field-translation.js";
import type { ControlOutcome, SourceChoice } from "../fieldControl.js";
import { fieldControlView, outcomeOf, showsSourceMenu, sourceChoicesOf } from "../fieldControl.js";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

const ENGLISH: SourceChoice = { code: "en", label: "English", panels: true };
const TWO_SOURCES: SourceChoice[] = [ENGLISH, { code: "de", label: "Deutsch", panels: false }];

const notice = (reason: FieldTranslationNotice["reason"]): FieldTranslationNotice => ({
  level: "info",
  reason,
  message: `because ${reason}`,
});

const view = (outcome: ControlOutcome, overrides: { allowed?: boolean; saved?: boolean } = {}) =>
  fieldControlView({
    allowed: overrides.allowed ?? true,
    saved: overrides.saved ?? true,
    sources: TWO_SOURCES,
    outcome,
  });

const failure = new Error("provider down");

describe("the source choices", () => {
  it("list every other locale, the host default first and marked as the panel's", () => {
    expect(sourceChoicesOf({ locales: LOCALES, defaultLocale: "en", target: "es" })).toEqual([
      { code: "en", label: "English", panels: true },
      { code: "de", label: "Deutsch", panels: false },
      { code: "fr", label: "Français", panels: false },
    ]);
  });

  it("put the default first even when the host lists it later", () => {
    const [first] = sourceChoicesOf({ locales: LOCALES, defaultLocale: "fr", target: "es" });
    expect(first).toEqual({ code: "fr", label: "Français", panels: true });
  });

  it("mark nothing when the editor stands in the default locale", () => {
    const choices = sourceChoicesOf({ locales: LOCALES, defaultLocale: "en", target: "en" });
    expect(choices.map((choice) => choice.code)).toEqual(["de", "fr", "es"]);
    expect(choices.some((choice) => choice.panels)).toBe(false);
  });

  it("are empty with a single locale", () => {
    expect(sourceChoicesOf({ locales: [LOCALES[0]!], defaultLocale: "en", target: "en" })).toEqual(
      []
    );
  });

  it("open a menu only with more than one other locale", () => {
    expect(showsSourceMenu([ENGLISH])).toBe(false);
    expect(showsSourceMenu(TWO_SOURCES)).toBe(true);
  });
});

describe("the field control's state", () => {
  it("is hidden without the ability, whatever else holds", () => {
    expect(view({ kind: "translated", source: "en", previous: "x" }, { allowed: false })).toEqual({
      kind: "hidden",
    });
  });

  it("is hidden with no locale to pull from", () => {
    expect(
      fieldControlView({ allowed: true, saved: true, sources: [], outcome: { kind: "idle" } })
    ).toEqual({ kind: "hidden" });
  });

  it("is unsaved before the document is saved", () => {
    expect(view({ kind: "idle" }, { saved: false })).toEqual({ kind: "unsaved" });
  });

  it("is ready with no notice when nothing was pressed", () => {
    expect(view({ kind: "idle" })).toEqual({ kind: "ready", notice: null });
  });

  it("is translating while the provider is asked", () => {
    expect(view({ kind: "translating", source: "en", previous: "x" })).toEqual({
      kind: "translating",
    });
  });

  it("is translated after a value came back", () => {
    expect(view({ kind: "translated", source: "en", previous: "x" })).toEqual({
      kind: "translated",
    });
  });

  it("is failed with the error after a failure", () => {
    expect(view({ kind: "failed", source: "en", previous: "x", error: failure })).toEqual({
      kind: "failed",
      error: failure,
    });
  });

  it("is ready with the notice after a noop answer", () => {
    expect(view({ kind: "noted", notice: notice("not-translatable") })).toEqual({
      kind: "ready",
      notice: notice("not-translatable"),
    });
  });

  it("is localized-list after the server refuses the field as inside a localized list", () => {
    expect(view({ kind: "noted", notice: notice("localized-list") })).toEqual({
      kind: "localized-list",
    });
  });
});

describe("an answer's outcome", () => {
  it("keeps the source and the earlier value when a value came back", () => {
    expect(
      outcomeOf({ status: "translated", value: "Hallo" }, { source: "en", previous: "Hello" })
    ).toEqual({ kind: "translated", source: "en", previous: "Hello" });
  });

  it("carries the notice of a noop answer", () => {
    expect(
      outcomeOf({ status: "noop", notice: notice("excluded") }, { source: "en", previous: "Hello" })
    ).toEqual({ kind: "noted", notice: notice("excluded") });
  });
});
