import { describe, expect, it } from "vitest";
import { prefixClassList } from "../../scripts/prefix-classes";

describe("prefixClassList", () => {
  it("prefixes every plain utility token", () => {
    expect(prefixClassList("flex items-center gap-2")).toBe(
      "franalytics:flex franalytics:items-center franalytics:gap-2"
    );
  });

  it("prefixes variant chains as a whole", () => {
    expect(prefixClassList("hover:bg-neutral-100 motion-reduce:animate-none")).toBe(
      "franalytics:hover:bg-neutral-100 franalytics:motion-reduce:animate-none"
    );
    expect(prefixClassList("dark:text-neutral-200")).toBe("franalytics:dark:text-neutral-200");
  });

  it("prefixes arbitrary values", () => {
    expect(prefixClassList("w-[calc(var(--base)*1.6)]")).toBe(
      "franalytics:w-[calc(var(--base)*1.6)]"
    );
    expect(prefixClassList("not-last:after:content-['']")).toBe(
      "franalytics:not-last:after:content-['']"
    );
  });

  it("skips plugin component classes (franalytics- prefix)", () => {
    expect(prefixClassList("franalytics-view relative text-neutral-800")).toBe(
      "franalytics-view franalytics:relative franalytics:text-neutral-800"
    );
    expect(prefixClassList("franalytics-animate-shimmer m-0")).toBe(
      "franalytics-animate-shimmer franalytics:m-0"
    );
  });

  it("is idempotent", () => {
    const once = prefixClassList("flex franalytics-view hover:bg-neutral-100");
    expect(prefixClassList(once)).toBe(once);
  });

  it("preserves original whitespace and empty strings", () => {
    expect(prefixClassList("")).toBe("");
    expect(prefixClassList("  flex  gap-2 ")).toBe("  franalytics:flex  franalytics:gap-2 ");
  });
});
