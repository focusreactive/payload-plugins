import { describe, expect, it } from "vitest";
import { createTranslator, normalizeMessageKey } from "../../src/translations/translate";
import { cs } from "../../src/translations/messages/cs";

describe("createTranslator", () => {
  it("interpolates {{vars}} and leaves unknown placeholders alone", () => {
    const t = createTranslator("en", { greet: "Hi {{name}}, {{missing}}" });
    expect(t("greet" as never, { name: "Ada" })).toBe("Hi Ada, {{missing}}");
  });

  it("falls back to English for a key the language lacks", () => {
    const t = createTranslator("de", { title: "SEO-Analyse" });
    expect(t("title")).toBe("SEO-Analyse");
    expect(t("close")).toBe("Close");
  });

  it("returns the key itself when nobody has it", () => {
    const t = createTranslator("en", undefined);
    expect(t("no.such.key" as never)).toBe("no.such.key");
  });

  it("picks the Czech plural form with Czech rules", () => {
    const t = createTranslator("cs", cs);
    expect(t("viz.show.link", { count: 1 })).toBe("Zobrazit 1 odkaz");
    expect(t("viz.show.link", { count: 3 })).toBe("Zobrazit 3 odkazy");
    expect(t("viz.show.link", { count: 5 })).toBe("Zobrazit 5 odkazů");
    expect(t("headings.errors", { count: 2 })).toBe("2 chyby");
  });

  it("picks the English plural form with English rules", () => {
    const t = createTranslator("en", undefined);
    expect(t("viz.show.link", { count: 1 })).toBe("Show 1 link");
    expect(t("viz.show.link", { count: 5 })).toBe("Show 5 links");
  });

  it("never mixes a language's plural with English forms", () => {
    const t = createTranslator("de", { "viz.show.link_other": "{{count}} Links anzeigen" });
    expect(t("viz.show.link", { count: 1 })).toBe("1 Links anzeigen");
  });

  it("uses the plain key when a count is given but there is no plural", () => {
    const t = createTranslator("en", undefined);
    expect(t("headings.multipleH1.title", { count: 3 })).toBe("Multiple H1 headings (3)");
  });

  it("survives a language tag Intl does not know", () => {
    const t = createTranslator("not a locale", undefined);
    expect(t("viz.show.link", { count: 2 })).toBe("Show 2 links");
  });
});

describe("normalizeMessageKey", () => {
  it.each([
    ["seo:tab:keyphrase", "tab.keyphrase"],
    ["seo:tab.keyphrase", "tab.keyphrase"],
    ["tab.keyphrase", "tab.keyphrase"],
    ["seo:title", "title"],
  ])("%s -> %s", (input, output) => {
    expect(normalizeMessageKey(input)).toBe(output);
  });
});
