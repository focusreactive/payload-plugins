// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LocaleStatus } from "../LocaleStatus.js";

const STARTED = "2026-11-24T09:00:00.000Z";
const A_MINUTE = 60_000;

const minutesAfterStart = (minutes: number) =>
  new Date(new Date(STARTED).getTime() + minutes * A_MINUTE);

const sentenceAt = (now: Date, kind: "translating" | "queued" = "translating"): string => {
  const { container } = render(
    <LocaleStatus
      row={{ kind, queuedAt: STARTED, locales: ["de"] }}
      labelOf={(locale) => locale}
      now={now}
    />
  );
  return container.textContent ?? "";
};

afterEach(cleanup);

describe("a locale whose run is still open", () => {
  it("reads as translating while the run is young", () => {
    expect(sentenceAt(minutesAfterStart(2))).toContain("Translating");
  });

  it("still reads as translating a minute short of the window", () => {
    expect(sentenceAt(minutesAfterStart(4))).toContain("Translating");
  });

  it("says there has been no news once the run outlives the window", () => {
    const sentence = sentenceAt(minutesAfterStart(6));

    expect(sentence).toMatch(/No news since \d{1,2}:\d{2}/u);
    expect(sentence).not.toContain("Translating");
  });
});

/*
 * A run whose work disappeared before anything picked it up never reaches `translating`, so the
 * window added for a run in flight never covered it. It is also the likelier of the two: the work
 * is unclaimed for longest while it is still waiting.
 */
describe("a locale whose run never started", () => {
  it("reads as queued while the run is young", () => {
    expect(sentenceAt(minutesAfterStart(2), "queued")).toContain("Queued");
  });

  it("says there has been no news once it outlives the window", () => {
    const sentence = sentenceAt(minutesAfterStart(6), "queued");

    expect(sentence).toMatch(/No news since \d{1,2}:\d{2}/u);
    expect(sentence).not.toContain("Queued");
  });
});
