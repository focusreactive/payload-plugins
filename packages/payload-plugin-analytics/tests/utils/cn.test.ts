import { describe, expect, it } from "vitest";
import { cn } from "../../src/utils/style";

describe("cn with franalytics prefix", () => {
  it("resolves conflicts between franalytics-prefixed utilities", () => {
    expect(cn("franalytics:p-2", "franalytics:p-4")).toBe("franalytics:p-4");
    expect(cn("franalytics:hover:bg-neutral-100", "franalytics:hover:bg-neutral-200")).toBe(
      "franalytics:hover:bg-neutral-200"
    );
  });

  it("keeps consumer (unprefixed) classes untouched alongside plugin classes", () => {
    expect(cn("franalytics:px-2", "consumer-card")).toBe("franalytics:px-2 consumer-card");
  });

  it("still flattens conditional inputs", () => {
    expect(cn("franalytics:flex", false, undefined, "franalytics:gap-2")).toBe(
      "franalytics:flex franalytics:gap-2"
    );
  });
});
