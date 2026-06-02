import { describe, expect, it } from "vitest";
import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";
import { getDeviceIcon } from "../../../../src/components/AnalyticsView/icons/getDeviceIcon";

describe("getDeviceIcon", () => {
  it.each([
    ["desktop", Monitor],
    ["mobile", Smartphone],
    ["tablet", Tablet],
    ["other", HelpCircle],
  ])("maps %s", (cat, icon) => {
    expect(getDeviceIcon(cat as any)).toBe(icon);
  });
});
