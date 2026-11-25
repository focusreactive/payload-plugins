import { describe, expect, it } from "vitest";

import { timeAgo } from "../timeAgo.js";

const NOW = new Date("2026-11-13T12:00:00.000Z");

describe("how long ago", () => {
  it.each([
    ["2026-11-13T11:59:40.000Z", "just now"],
    ["2026-11-13T11:59:00.000Z", "1 minute ago"],
    ["2026-11-13T09:00:00.000Z", "3 hours ago"],
    ["2026-11-11T12:00:00.000Z", "2 days ago"],
    ["2026-09-13T12:00:00.000Z", "2 months ago"],
    ["2024-11-13T12:00:00.000Z", "2 years ago"],
  ])("reads %s as %s", (iso, expected) => {
    expect(timeAgo(iso, NOW)).toBe(expected);
  });
});
