import { describe, expect, it } from "vitest";

import type { RunState } from "../../../../types/wire/RunState.js";
import { POLL_INTERVAL_MS, pollWhileRunning } from "../queries/polling.js";

const base = { locales: ["de"], queuedAt: "2026-11-13T00:00:00.000Z" };
const queued: RunState = { ...base, status: "queued" };
const running: RunState = { ...base, status: "running" };
const failed: RunState = { ...base, status: "failed", message: "boom" };
const notStarted: RunState = { ...base, status: "not-started", failedLocale: "fr" };

describe("the polling rule", () => {
  it("polls every 20 seconds", () => {
    expect(POLL_INTERVAL_MS).toBe(20_000);
  });

  it.each([
    ["queued", queued],
    ["running", running],
  ])("polls while a locale's run is %s", (_, run) => {
    expect(pollWhileRunning([{ run: null }, { run }])).toBe(POLL_INTERVAL_MS);
  });

  it.each([
    ["no run", null],
    ["a failed run", failed],
    ["a not-started run", notStarted],
  ])("stops when every locale holds %s", (_, run) => {
    expect(pollWhileRunning([{ run }, { run: null }])).toBe(false);
  });

  it("stops when there are no locales", () => {
    expect(pollWhileRunning([])).toBe(false);
  });
});
