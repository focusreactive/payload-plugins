// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LocaleStatus } from "../LocaleStatus.js";

const STARTED = "2026-11-24T09:00:00.000Z";
const A_MINUTE = 60_000;

const minutesAfterStart = (minutes: number) =>
  new Date(new Date(STARTED).getTime() + minutes * A_MINUTE);

const sentenceAt = (now: Date): string => {
  const { container } = render(
    <LocaleStatus
      row={{ kind: "translating", startedAt: STARTED, locales: ["de"] }}
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
