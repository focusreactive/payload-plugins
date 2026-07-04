import { describe, expect, it } from "vitest";
import { transformSource } from "../../scripts/prefix-classes";

const t = (code: string) => transformSource(code, "dist/fake.js").code;

describe("transformSource", () => {
  it("transforms className string props in jsx calls", () => {
    expect(t(`jsx("div", { className: "flex gap-2" });`)).toBe(
      `jsx("div", { className: "frseo:flex frseo:gap-2" });`
    );
  });

  it("keeps frseo- component classes in className", () => {
    expect(t(`jsx("div", { className: "frseo-root relative" });`)).toBe(
      `jsx("div", { className: "frseo-root frseo:relative" });`
    );
  });

  it("transforms ternary branches in className but not conditions", () => {
    expect(t(`jsx("div", { className: mode === "desktop" ? "flex" : "hidden" });`)).toBe(
      `jsx("div", { className: mode === "desktop" ? "frseo:flex" : "frseo:hidden" });`
    );
  });

  it("transforms cn() args: literals, ternaries, && right side only", () => {
    expect(t(`cn("mt-[8px] flex-col", open ? "flex" : "hidden");`)).toBe(
      `cn("frseo:mt-[8px] frseo:flex-col", open ? "frseo:flex" : "frseo:hidden");`
    );
    expect(t(`cn(status === "good" && "bg-seo-good");`)).toBe(
      `cn(status === "good" && "frseo:bg-seo-good");`
    );
  });

  it("does not descend into non-cn calls inside cn args", () => {
    expect(t(`cn(statusVar({ status: "good" }), "flex");`)).toBe(
      `cn(statusVar({ status: "good" }), "frseo:flex");`
    );
  });

  it("transforms cva base and variant values but not variant keys or defaultVariants", () => {
    const input = `const v = cva("rounded-full grid", {
  variants: { size: { medium: "w-4 h-4", large: "w-8" } },
  defaultVariants: { size: "medium" },
});`;
    const output = `const v = cva("frseo:rounded-full frseo:grid", {
  variants: { size: { medium: "frseo:w-4 frseo:h-4", large: "frseo:w-8" } },
  defaultVariants: { size: "medium" },
});`;
    expect(t(input)).toBe(output);
  });

  it("transforms only class/className values in compoundVariants", () => {
    const input = `cva("base-x", { variants: { a: { on: "p-1" } }, compoundVariants: [{ a: "on", class: "m-2" }] });`;
    const output = `cva("frseo:base-x", { variants: { a: { on: "frseo:p-1" } }, compoundVariants: [{ a: "on", class: "frseo:m-2" }] });`;
    expect(t(input)).toBe(output);
  });

  it("transforms string keys in clsx object syntax, not values", () => {
    expect(t(`cn({ "flex gap-2": isOpen });`)).toBe(`cn({ "frseo:flex frseo:gap-2": isOpen });`);
  });

  it("leaves unrelated strings untouched", () => {
    const input = `const PKG = "@focus-reactive/payload-plugin-seo"; jsx("div", { "aria-label": "flex layout" });`;
    expect(t(input)).toBe(input);
  });

  it("is idempotent", () => {
    const once = t(`jsx("div", { className: "flex frseo-root" });`);
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
