import { describe, expect, it } from "vitest";
import { buildInput } from "../../src/components/SeoDrawer/buildInput";
import type { SeoFieldPaths } from "../../src/types/config";

const FIELDS: SeoFieldPaths = {
  seoTitle: "meta.title",
  metaDescription: "meta.description",
  slug: "slug",
};
const SITE = { name: "Acme", baseUrl: "https://acme.test" };

describe("buildInput", () => {
  it("prefers the seoTitle field, falling back to the top-level title", () => {
    const withSeo = buildInput({
      values: { meta: { title: "SEO Title" }, title: "Doc Title" },
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(withSeo.title).toBe("SEO Title");

    const fallback = buildInput({
      values: { title: "Doc Title" },
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(fallback.title).toBe("Doc Title");
  });

  it("reads slug + description and passes contentHtml through", () => {
    const input = buildInput({
      values: { slug: "my-slug", meta: { description: "Desc" } },
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(input.slug).toBe("my-slug");
    expect(input.description).toBe("Desc");
    expect(input.contentHtml).toBe("<p>content</p>");
  });

  it("normalizes locale to xx_XX from a string, object, or null", () => {
    const at = (locale: unknown) =>
      buildInput({
        values: {},
        locale: locale as never,
        keyphrases: [{ text: "k", synonyms: [] }],
        fields: FIELDS,
        site: SITE,
        contentHtml: "",
      }).locale;
    expect(at("en")).toBe("en_EN");
    expect(at({ code: "de" })).toBe("de_DE");
    expect(at("fr_FR")).toBe("fr_FR");
    expect(at(null)).toBe("en_EN");
  });

  it("sets has flags from field presence and values", () => {
    const present = buildInput({
      values: { meta: { title: "T" } },
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(present.has).toEqual({
      seoTitle: true,
      metaDescription: true,
      slug: true,
      content: true,
    });

    const sparse = buildInput({
      values: {},
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: {},
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(sparse.has.seoTitle).toBe(false);
    expect(sparse.has.metaDescription).toBe(false);
    expect(sparse.has.content).toBe(true);
  });

  it("derives has.content from contentHtml, not a field path", () => {
    const empty = buildInput({
      values: {},
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "",
    });
    expect(empty.has.content).toBe(false);

    const filled = buildInput({
      values: {},
      locale: "en",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>x</p>",
    });
    expect(filled.has.content).toBe(true);
  });

  it("passes keyphrase and site through unchanged", () => {
    const input = buildInput({
      values: {},
      locale: "en",
      keyphrases: [{ text: "focus kp", synonyms: [] }],
      fields: FIELDS,
      site: SITE,
      contentHtml: "<p>content</p>",
    });
    expect(input.keyphrase).toBe("focus kp");
    expect(input.site).toEqual(SITE);
  });
});

describe("buildInput multi-keyphrase", () => {
  it("focus keyphrase is keyphrases[0]; list is passed through", () => {
    const out = buildInput({
      values: { title: "T", slug: "s" },
      contentHtml: "<p>x</p>",
      locale: "en",
      keyphrases: [
        { text: "payload cms", synonyms: ["payloadcms"] },
        { text: "headless cms", synonyms: [] },
      ],
      fields: { slug: "slug" },
      site: { name: "n", baseUrl: "" },
    });
    expect(out.keyphrase).toBe("payload cms");
    expect(out.keyphrases).toHaveLength(2);
    expect(out.keyphrases[0].synonyms).toEqual(["payloadcms"]);
  });

  it("empty list yields empty focus keyphrase", () => {
    const out = buildInput({
      values: {},
      contentHtml: "",
      locale: "en",
      keyphrases: [],
      fields: {},
      site: { name: "", baseUrl: "" },
    });
    expect(out.keyphrase).toBe("");
    expect(out.keyphrases).toEqual([]);
  });
});
