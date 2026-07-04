import { describe, expect, it } from "vitest";
import { prefixClassList } from "../../scripts/prefix-classes";

describe("prefixClassList", () => {
  it("prefixes every plain utility token", () => {
    expect(prefixClassList("flex items-center gap-2")).toBe(
      "frcomments:flex frcomments:items-center frcomments:gap-2"
    );
  });

  it("prefixes variant chains as a whole", () => {
    expect(prefixClassList("hover:bg-neutral-100 motion-reduce:animate-none")).toBe(
      "frcomments:hover:bg-neutral-100 frcomments:motion-reduce:animate-none"
    );
    expect(prefixClassList("dark:text-neutral-200")).toBe("frcomments:dark:text-neutral-200");
  });

  it("prefixes arbitrary values", () => {
    expect(prefixClassList("w-[calc(var(--base)*1.6)]")).toBe(
      "frcomments:w-[calc(var(--base)*1.6)]"
    );
    expect(prefixClassList("not-last:after:content-['']")).toBe(
      "frcomments:not-last:after:content-['']"
    );
  });

  it("skips plugin component classes (frcomments- prefix)", () => {
    expect(prefixClassList("frcomments-drawer relative text-neutral-800")).toBe(
      "frcomments-drawer frcomments:relative frcomments:text-neutral-800"
    );
    expect(prefixClassList("frcomments-drawer m-0")).toBe("frcomments-drawer frcomments:m-0");
  });

  it("is idempotent", () => {
    const once = prefixClassList("flex frcomments-drawer hover:bg-neutral-100");
    expect(prefixClassList(once)).toBe(once);
  });

  it("preserves original whitespace and empty strings", () => {
    expect(prefixClassList("")).toBe("");
    expect(prefixClassList("  flex  gap-2 ")).toBe("  frcomments:flex  frcomments:gap-2 ");
  });
});
