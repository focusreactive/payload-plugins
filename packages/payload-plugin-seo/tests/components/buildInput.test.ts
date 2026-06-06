import { describe, expect, it } from "vitest";
import { buildInput } from "../../src/components/SeoDrawer/buildInput";
import type { SeoFieldPaths } from "../../src/types/config";

const FIELDS: SeoFieldPaths = {
  seoTitle: "meta.title",
  metaDescription: "meta.description",
  slug: "slug",
  content: "body",
};
const SITE = { name: "Acme", baseUrl: "https://acme.test" };
const stubExtractor = () => "<p>content</p>";

describe("buildInput", () => {
  it("prefers the seoTitle field, falling back to the top-level title", () => {
    const withSeo = buildInput({
      values: { meta: { title: "SEO Title" }, title: "Doc Title" },
      locale: "en",
      keyphrase: "k",
      fields: FIELDS,
      site: SITE,
      override: stubExtractor,
    });
    expect(withSeo.title).toBe("SEO Title");

    const fallback = buildInput({
      values: { title: "Doc Title" },
      locale: "en",
      keyphrase: "k",
      fields: FIELDS,
      site: SITE,
      override: stubExtractor,
    });
    expect(fallback.title).toBe("Doc Title");
  });

  it("reads slug + description and extracts content via the extractor", () => {
    const input = buildInput({
      values: { slug: "my-slug", meta: { description: "Desc" } },
      locale: "en",
      keyphrase: "k",
      fields: FIELDS,
      site: SITE,
      override: stubExtractor,
    });
    expect(input.slug).toBe("my-slug");
    expect(input.description).toBe("Desc");
    expect(input.contentHtml).toBe("<p>content</p>");
  });

  it("normalizes locale to xx_XX from a string, object, or null", () => {
    const at = (locale: unknown) => buildInput({ values: {}, locale: locale as never, keyphrase: "k", fields: FIELDS, site: SITE, override: stubExtractor }).locale;
    expect(at("en")).toBe("en_EN");
    expect(at({ code: "de" })).toBe("de_DE");
    expect(at("fr_FR")).toBe("fr_FR");
    expect(at(null)).toBe("en_EN");
  });

  it("sets has flags from field presence and values", () => {
    const present = buildInput({
      values: { meta: { title: "T" } },
      locale: "en",
      keyphrase: "k",
      fields: FIELDS,
      site: SITE,
      override: stubExtractor,
    });
    expect(present.has).toEqual({ seoTitle: true, metaDescription: true, slug: true, content: true });

    const sparse = buildInput({
      values: {},
      locale: "en",
      keyphrase: "k",
      fields: { content: "body" } as SeoFieldPaths,
      site: SITE,
      override: stubExtractor,
    });
    expect(sparse.has.seoTitle).toBe(false);
    expect(sparse.has.metaDescription).toBe(false);
    expect(sparse.has.content).toBe(true);
  });

  it("passes keyphrase and site through unchanged", () => {
    const input = buildInput({
      values: {},
      locale: "en",
      keyphrase: "focus kp",
      fields: FIELDS,
      site: SITE,
      override: stubExtractor,
    });
    expect(input.keyphrase).toBe("focus kp");
    expect(input.site).toEqual(SITE);
  });
});
