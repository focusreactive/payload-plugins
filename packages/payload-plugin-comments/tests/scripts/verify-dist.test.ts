import { describe, expect, it } from "vitest";
import { verifyCss, verifyJs } from "../../scripts/verify-dist";

const GOOD_CSS = `@layer theme {
  :root, :host {
    --frcomments-color-neutral-100: var(--theme-elevation-100);
    --frcomments-radius-rs: var(--style-radius-s);
    --frcomments-shadow-popover: 0 12px 32px -12px var(--comments-shadow-strong);
  }
}
:root {
  --comments-shadow-strong: oklch(0.2 0.01 70 / 0.14);
}
@layer utilities {
  .frcomments\\:flex {
    display: flex;
  }
  .frcomments\\:gap-2 {
    gap: calc(var(--frcomments-spacing) * 2);
  }
}
.frcomments-drawer .gutter {
  padding: 0 20px !important;
}
.frcomments-drawer .drawer__content {
  --gutter-h: 1px;
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
      verifyCss(`${GOOD_CSS}\n.frcomments\\:x {\n  gap: calc(var(--spacing) * 2);\n}`)
    ).not.toEqual([]);
  });
});

describe("verifyJs", () => {
  it("accepts prefixed and component-class literals", () => {
    expect(
      verifyJs(`jsx("div", { className: "frcomments:flex frcomments:gap-2" });`, "a.js")
    ).toEqual([]);
    expect(
      verifyJs(`jsx("div", { className: "frcomments-drawer frcomments:relative" });`, "a.js")
    ).toEqual([]);
    expect(verifyJs(`jsx("div", { className: cn("x") });`, "a.js")).toEqual([]);
  });

  it("accepts prefixed literals with leading escaped whitespace (transformed template literals)", () => {
    expect(
      verifyJs(`jsx("div", { className: "\\n  frcomments:flex frcomments:gap-2\\n" });`, "a.js")
    ).toEqual([]);
  });

  it("flags unprefixed className literals", () => {
    expect(verifyJs(`jsx("div", { className: "flex gap-2" });`, "a.js")).not.toEqual([]);
    expect(verifyJs(`jsx("div", { className: "\\n  flex gap-2\\n" });`, "a.js")).not.toEqual([]);
  });
});
