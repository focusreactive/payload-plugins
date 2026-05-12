import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkeletonBlock } from "../../../../src/components/AnalyticsView/ui/SkeletonBlock";

describe("SkeletonBlock", () => {
  it.each(["kpi", "table", "chart"] as const)("renders for shape %s", (shape) => {
    const { container } = render(<SkeletonBlock shape={shape} />);
    expect(container.querySelectorAll(".pa-animate-shimmer").length).toBeGreaterThan(0);
  });
});
