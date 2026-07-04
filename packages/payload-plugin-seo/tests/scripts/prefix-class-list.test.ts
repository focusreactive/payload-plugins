import { describe, expect, it } from "vitest";
import { prefixClassList } from "../../scripts/prefix-classes";

describe("prefixClassList", () => {
  it("prefixes every plain utility token", () => {
    expect(prefixClassList("flex items-center gap-2")).toBe(
      "frseo:flex frseo:items-center frseo:gap-2"
    );
  });

  it("prefixes variant chains as a whole", () => {
    expect(prefixClassList("hover:bg-neutral-100 motion-reduce:animate-none")).toBe(
      "frseo:hover:bg-neutral-100 frseo:motion-reduce:animate-none"
    );
    expect(prefixClassList("dark:text-seo-good")).toBe("frseo:dark:text-seo-good");
  });

  it("prefixes arbitrary values", () => {
    expect(prefixClassList("w-[calc(var(--base)*1.6)]")).toBe("frseo:w-[calc(var(--base)*1.6)]");
    expect(prefixClassList("not-last:after:content-['']")).toBe(
      "frseo:not-last:after:content-['']"
    );
  });

  it("skips plugin component classes (seo- prefix)", () => {
    expect(prefixClassList("frseo-root relative text-neutral-800")).toBe(
      "frseo-root frseo:relative frseo:text-neutral-800"
    );
    expect(prefixClassList("frseo-doc-btn m-0")).toBe("frseo-doc-btn frseo:m-0");
  });

  it("is idempotent", () => {
    const once = prefixClassList("flex frseo-root hover:bg-neutral-100");
    expect(prefixClassList(once)).toBe(once);
  });

  it("preserves original whitespace and empty strings", () => {
    expect(prefixClassList("")).toBe("");
    expect(prefixClassList("  flex  gap-2 ")).toBe("  frseo:flex  frseo:gap-2 ");
  });
});
