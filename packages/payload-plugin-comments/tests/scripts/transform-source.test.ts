import { describe, expect, it } from "vitest";
import { transformSource } from "../../scripts/prefix-classes";

const t = (code: string) => transformSource(code, "dist/fake.js").code;

describe("transformSource", () => {
  it("transforms className string props in jsx calls", () => {
    expect(t(`jsx("div", { className: "flex gap-2" });`)).toBe(
      `jsx("div", { className: "frcomments:flex frcomments:gap-2" });`
    );
  });

  it("keeps frcomments- component classes in className", () => {
    expect(t(`jsx("div", { className: "frcomments-drawer relative" });`)).toBe(
      `jsx("div", { className: "frcomments-drawer frcomments:relative" });`
    );
  });

  it("transforms ternary branches in className but not conditions", () => {
    expect(t(`jsx("div", { className: mode === "desktop" ? "flex" : "hidden" });`)).toBe(
      `jsx("div", { className: mode === "desktop" ? "frcomments:flex" : "frcomments:hidden" });`
    );
  });

  it("transforms cn() args: literals, ternaries, && right side only", () => {
    expect(t(`cn("mt-[8px] flex-col", open ? "flex" : "hidden");`)).toBe(
      `cn("frcomments:mt-[8px] frcomments:flex-col", open ? "frcomments:flex" : "frcomments:hidden");`
    );
    expect(t(`cn(status === "resolved" && "bg-neutral-100");`)).toBe(
      `cn(status === "resolved" && "frcomments:bg-neutral-100");`
    );
  });

  it("does not descend into non-cn calls inside cn args", () => {
    expect(t(`cn(statusVar({ status: "good" }), "flex");`)).toBe(
      `cn(statusVar({ status: "good" }), "frcomments:flex");`
    );
  });

  it("transforms cva base and variant values but not variant keys or defaultVariants", () => {
    const input = `const v = cva("rounded-full grid", {
  variants: { size: { medium: "w-4 h-4", large: "w-8" } },
  defaultVariants: { size: "medium" },
});`;
    const output = `const v = cva("frcomments:rounded-full frcomments:grid", {
  variants: { size: { medium: "frcomments:w-4 frcomments:h-4", large: "frcomments:w-8" } },
  defaultVariants: { size: "medium" },
});`;
    expect(t(input)).toBe(output);
  });

  it("transforms only class/className values in compoundVariants", () => {
    const input = `cva("base-x", { variants: { a: { on: "p-1" } }, compoundVariants: [{ a: "on", class: "m-2" }] });`;
    const output = `cva("frcomments:base-x", { variants: { a: { on: "frcomments:p-1" } }, compoundVariants: [{ a: "on", class: "frcomments:m-2" }] });`;
    expect(t(input)).toBe(output);
  });

  it("transforms string keys in clsx object syntax, not values", () => {
    expect(t(`cn({ "flex gap-2": isOpen });`)).toBe(
      `cn({ "frcomments:flex frcomments:gap-2": isOpen });`
    );
  });

  it("prefixes multiline no-substitution template literals, preserving whitespace", () => {
    const input = 'jsx("textarea", { className: `\n  w-full resize-none\n  text-[13px]\n` });';
    const output =
      'jsx("textarea", { className: "\\n  frcomments:w-full frcomments:resize-none\\n  frcomments:text-[13px]\\n" });';
    expect(t(input)).toBe(output);
  });

  it("leaves unrelated strings untouched", () => {
    const input = `const PKG = "@focus-reactive/payload-plugin-comments"; jsx("div", { "aria-label": "flex layout" });`;
    expect(t(input)).toBe(input);
  });

  it("is idempotent", () => {
    const once = t(`jsx("div", { className: "flex frcomments-drawer" });`);
    expect(t(once)).toBe(once);
  });

  it("reports changed=false for untouched files", () => {
    expect(transformSource(`const x = 1;`, "dist/x.js").changed).toBe(false);
  });

  it("throws with file:line:col on template literals with substitutions", () => {
    const substitution = "$".concat("{extra}");
    expect(() => t(`jsx("div", { className: \`flex ${substitution}\` });`)).toThrow(
      /dist\/fake\.js:1:\d+/u
    );
  });
});
