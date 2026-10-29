import { describe, expect, it } from "vitest";

import { resolveTypeLabels } from "../../src/admin/TreeView/typeLabels.js";

const bilingual = () => ({ de: "Seite", en: "Page" });
const pagesOnly = (slug: string) => (slug === "pages" ? { de: "Seite", en: "Page" } : undefined);
const fromAdmin = (slug: string) =>
  slug === "pages"
    ? ({ i18n }: { i18n: unknown }) => `from ${(i18n as { name: string }).name}`
    : undefined;

const settings = {
  pages: { explicit: false, label: "Seite" },
  posts: { explicit: true, label: "Blog post" },
};

describe("resolveTypeLabels", () => {
  it("reads a collection's own label in the admin language, not the first one in the config", () => {
    expect(resolveTypeLabels(settings, pagesOnly, "en").pages).toBe("Page");
    expect(resolveTypeLabels(settings, pagesOnly, "de").pages).toBe("Seite");
  });

  it("falls back to the default language, then to the label from the config", () => {
    expect(resolveTypeLabels(settings, bilingual, "fr").pages).toBe("Page");
    expect(resolveTypeLabels(settings, () => undefined, "fr").pages).toBe("Seite");
  });

  it("keeps a label given to the plugin over the collection's own", () => {
    expect(resolveTypeLabels(settings, () => ({ en: "Article" }), "en").posts).toBe("Blog post");
  });

  it("calls a label function with the admin's i18n", () => {
    const labels = resolveTypeLabels(settings, fromAdmin, "en", { name: "the admin" } as never);

    expect(labels.pages).toBe("from the admin");
  });
});
