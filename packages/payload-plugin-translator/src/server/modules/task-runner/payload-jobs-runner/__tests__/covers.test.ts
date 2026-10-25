import { describe, expect, it } from "vitest";

import type { TranslationFilter } from "../../../../../core/domain/selection/index.js";
import { covers } from "../model/covers.js";

const leaves = (...addresses: string[]): TranslationFilter => ({ kind: "leaves", addresses });
const rule = (name: string): TranslationFilter => ({ kind: "rule", name });

describe("whether a live run already translates what a request asks for", () => {
  it("a run that narrows by nothing covers an ask that narrows by nothing", () => {
    expect(covers([], [])).toBe(true);
  });

  it("a run that narrows by nothing covers an ask that names leaves", () => {
    expect(covers([], [leaves("title")])).toBe(true);
  });

  it("a run that narrows by nothing covers an ask that names a rule", () => {
    expect(covers([], [rule("stale")])).toBe(true);
  });

  it("a run that names leaves does not cover an ask that names none", () => {
    expect(covers([leaves("title")], [])).toBe(false);
  });

  it("a run that names leaves covers an ask naming a subset of them", () => {
    expect(covers([leaves("title", "body")], [leaves("body")])).toBe(true);
  });

  it("a run that names leaves does not cover an ask naming one it left out", () => {
    expect(covers([leaves("title")], [leaves("body")])).toBe(false);
  });

  it("a run that names leaves does not cover an ask naming those and more", () => {
    expect(covers([leaves("title")], [leaves("title", "body")])).toBe(false);
  });

  it("a run that names the same leaves covers the ask", () => {
    expect(covers([leaves("title")], [leaves("title")])).toBe(true);
  });

  it("a run that names a rule covers an ask naming the same rule", () => {
    expect(covers([rule("stale")], [rule("stale")])).toBe(true);
  });

  it("a run that names a rule does not cover an ask naming a different one", () => {
    expect(covers([rule("stale")], [rule("other")])).toBe(false);
  });

  it("a run that names a rule does not cover an ask that names only leaves", () => {
    expect(covers([rule("stale")], [leaves("title")])).toBe(false);
  });

  it("a run that names leaves does not cover an ask that names only a rule", () => {
    expect(covers([leaves("title")], [rule("stale")])).toBe(false);
  });

  it("covers an ask only when every filter the run carries is accepted", () => {
    const run = [leaves("title", "body"), rule("stale")];

    expect(covers(run, [leaves("body"), rule("stale")])).toBe(true);
    expect(covers(run, [leaves("body")])).toBe(false);
  });

  it("answers the same however the filters are ordered", () => {
    const run = [rule("stale"), leaves("title", "body")];
    const ask = [leaves("body"), rule("stale")];

    expect(covers(run, ask)).toBe(covers([...run].reverse(), [...ask].reverse()));
  });
});
