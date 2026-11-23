import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAlternateLocales } from "@/dal/getAlternateLocales";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";

import { markedField as marked } from "../support/markers";

vi.mock("@/dal/getSiteSettings", () => ({ getSiteSettings: vi.fn() }));
vi.mock("@/dal/getAlternateLocales", () => ({ getAlternateLocales: vi.fn(async () => ({})) }));

const neverRead = <Value extends object>(field: string, value: Value): Value =>
  Object.defineProperty(value, field, {
    enumerable: true,
    get: () => {
      throw new Error(`${field} was read`);
    },
  });

const post = (title: string, description: string) => ({
  meta: { description },
  slug: "hello",
  title,
});

const metaOf = (doc: ReturnType<typeof post>) =>
  generateMeta({ collection: "posts", doc, locale: "en" });

describe("the metadata of a draft read", () => {
  beforeEach(() => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      general: { siteName: marked("Acme", "general.siteName") },
      notFound: { title: marked("Nothing here", "notFound.title") },
      seo: { titleSeparator: "|" },
    } as never);
  });

  it("states titles and descriptions without markers", async () => {
    const stored = await metaOf(post("Hello", "A first post"));
    const draftRead = await metaOf(
      post(marked("Hello", "title"), marked("A first post", "meta.description"))
    );

    expect(draftRead.title).toBe("Hello | Acme");
    expect(draftRead.description).toBe("A first post");
    expect(draftRead.openGraph).toEqual(stored.openGraph);
    expect(draftRead.twitter).toEqual(stored.twitter);
  });

  it("does not repeat a title that is the name of the site", async () => {
    const draftRead = await metaOf(post(marked("Acme", "title"), "The site"));

    expect(draftRead.title).toBe("Acme");
  });

  it("reads nothing of the document and the site settings but what the metadata states", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue(
      neverRead("footer", { general: { siteName: marked("Acme", "general.siteName") } }) as never
    );
    const page = neverRead("layout", {
      breadcrumbs: [{ doc: neverRead("layout", {}), url: marked("/about", "breadcrumbs.0.url") }],
      meta: { image: neverRead("alt", { url: "/media/og.png" }) },
      slug: "about",
      title: marked("About", "title"),
    });

    const meta = await generateMeta({ collection: "page", doc: page as never, locale: "en" });
    const notFound = await generateNotFoundMeta({ locale: "en" });

    expect(meta.title).toBe("About | Acme");
    expect(meta.alternates?.canonical).toMatch(/\/about$/u);
    expect(getAlternateLocales).toHaveBeenCalledWith(
      expect.objectContaining({ breadcrumbs: [{ url: "/about" }] })
    );
    expect(notFound.title).toBe("404 - Page not found | Acme");
  });

  it("ends the title of the page that was not found with the default site name when the settings name none", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      general: {},
      notFound: { title: "Nothing here" },
      seo: {},
    } as never);

    const notFound = await generateNotFoundMeta({ locale: "en" });

    expect(notFound.title).toBe("Nothing here | Site");
  });

  it("states the title of the page that was not found without markers", async () => {
    const notFound = await generateNotFoundMeta({ locale: "en" });

    expect(notFound.title).toBe("Nothing here | Acme");
  });
});
