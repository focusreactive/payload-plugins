import { describe, expect, it } from "vitest";
import { verifyCss, verifyJs } from "../../scripts/verify-dist";

const GOOD_CSS = `@layer theme {
  :root, :host {
    --franalytics-color-neutral-100: var(--theme-elevation-100);
    --franalytics-radius-rs: var(--style-radius-s);
    --franalytics-shadow-popover: 0 12px 32px -12px oklch(0.2 0.01 70 / 0.14);
  }
}
:root {
  --franalytics-metric-pos-bg: rgba(35, 134, 54, 0.14);
  --franalytics-metric-prev-radius: 999px;
}
@layer utilities {
  .franalytics\\:flex {
    display: flex;
  }
  .franalytics\\:gap-2 {
    gap: calc(var(--franalytics-spacing) * 2);
  }
}
.franalytics-view button {
  border: none;
}
.franalytics-animate-shimmer {
  background: var(--theme-elevation-100);
}`;

describe("verifyCss", () => {
  it("accepts fully prefixed output", () => {
    expect(verifyCss(GOOD_CSS)).toEqual([]);
  });

  it("rejects css without prefixed utilities or variables", () => {
    expect(verifyCss(":root { color: red }").length).toBeGreaterThan(0);
  });

  it("rejects unprefixed utility selectors", () => {
    expect(verifyCss(`${GOOD_CSS}\n.bg-neutral-100 {\n  background: red;\n}`)).not.toEqual([]);
    expect(verifyCss(`${GOOD_CSS}\n.table {\n  display: table;\n}`)).not.toEqual([]);
  });

  it("rejects unprefixed token declarations", () => {
    expect(verifyCss(`${GOOD_CSS}\n:root {\n  --color-neutral-100: red;\n}`)).not.toEqual([]);
    expect(verifyCss(`${GOOD_CSS}\n:root {\n  --spacing: 1rem;\n}`)).not.toEqual([]);
  });

  it("rejects unprefixed token references", () => {
    expect(
      verifyCss(`${GOOD_CSS}\n.franalytics\\:x {\n  gap: calc(var(--spacing) * 2);\n}`)
    ).not.toEqual([]);
  });
});

describe("verifyJs", () => {
  it("accepts prefixed and component-class literals", () => {
    expect(
      verifyJs(`jsx("div", { className: "franalytics:flex franalytics:gap-2" });`, "a.js")
    ).toEqual([]);
    expect(
      verifyJs(`jsx("div", { className: "franalytics-view franalytics:relative" });`, "a.js")
    ).toEqual([]);
    expect(verifyJs(`jsx("div", { className: cn("x") });`, "a.js")).toEqual([]);
  });

  it("flags unprefixed className literals", () => {
    expect(verifyJs(`jsx("div", { className: "flex gap-2" });`, "a.js")).not.toEqual([]);
  });
});
