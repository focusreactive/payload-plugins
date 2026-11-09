import { describe, expect, it } from "vitest";
import { buildTranslations } from "../../src/translations";

describe("buildTranslations", () => {
  it("registers the bundled languages under the seo namespace", () => {
    const out = buildTranslations();
    expect(out.en?.seo?.title).toBe("SEO Analytics");
    expect(out.cs?.seo?.title).toBe("SEO analýza");
  });

  it("layers the option on top, accepting the old colon-separated keys", () => {
    const out = buildTranslations({
      cs: { "seo:tab:keyphrase": "Fráze", "seo:title": "Moje SEO" },
    });
    expect(out.cs?.seo?.["tab.keyphrase"]).toBe("Fráze");
    expect(out.cs?.seo?.title).toBe("Moje SEO");
    expect(out.cs?.seo?.close).toBe("Zavřít");
  });

  it("adds a language the plugin does not ship", () => {
    const out = buildTranslations({ de: { "tab.keyphrase": "Fokus-Keyphrase" } });
    expect(out.de?.seo).toEqual({ "tab.keyphrase": "Fokus-Keyphrase" });
  });

  it("resolves through Payload's own t() key walk", () => {
    const out = buildTranslations();
    const [namespace, key] = "seo:tab.keyphrase".split(":") as [string, string];
    expect(out.en?.[namespace]?.[key]).toBe("Keyphrase");
  });
});
