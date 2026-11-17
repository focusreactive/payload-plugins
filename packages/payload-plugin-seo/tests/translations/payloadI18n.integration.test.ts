import { initI18n } from "@payloadcms/translations";
import { cs as csLanguage } from "@payloadcms/translations/languages/cs";
import { en as enLanguage } from "@payloadcms/translations/languages/en";
import { describe, expect, it } from "vitest";
import { buildTranslations, createTranslator, TRANSLATION_NAMESPACE } from "../../src/translations";
import type { Messages } from "../../src/translations";
import { mergeTranslations } from "../../src/utils/config/mergeTranslations";

const i18nFor = (language: "en" | "cs") =>
  initI18n({
    config: {
      fallbackLanguage: "en",
      supportedLanguages: { en: enLanguage, cs: csLanguage },
      translations: mergeTranslations(
        { cs: { custom: { hello: "Ahoj" } } },
        buildTranslations({ cs: { "seo:tab:keyphrase": "Hlavní fráze" } })
      ),
    } as never,
    context: "client",
    language,
  });

const seoStrings = (translations: unknown) =>
  (translations as Record<string, Messages>)[TRANSLATION_NAMESPACE];

describe("plugin strings inside Payload i18n", () => {
  it("serves Czech with Czech plural rules and the option's overrides", async () => {
    const i18n = await i18nFor("cs");
    const t = createTranslator("cs", seoStrings(i18n.translations));

    expect([1, 2, 4, 5, 0].map((count) => t("viz.show.link", { count }))).toEqual([
      "Zobrazit 1 odkaz",
      "Zobrazit 2 odkazy",
      "Zobrazit 4 odkazy",
      "Zobrazit 5 odkazů",
      "Zobrazit 0 odkazů",
    ]);
    expect(t("tab.keyphrase")).toBe("Hlavní fráze");
  });

  it("serves English to an English admin", async () => {
    const i18n = await i18nFor("en");
    const t = createTranslator("en", seoStrings(i18n.translations));

    expect(t("tab.keyphrase")).toBe("Keyphrases");
    expect(i18n.t("seo:title" as never)).toBe("SEO Analytics");
  });

  it("keeps the host's own namespaces", async () => {
    const i18n = await i18nFor("cs");

    expect((i18n.translations as Record<string, unknown>).custom).toEqual({ hello: "Ahoj" });
  });
});
