import { getAllDocuments, getPayloadClient, getSiteSettings } from "@/dal";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";

/** llms.txt (§5.11): what the site is and where its content lives, for AI search engines. */
export const revalidate = 3600;

function line(title: string, url: string, summary?: string | null): string {
  const text = summary?.replaceAll(/\s+/gu, " ").trim();
  return `- [${title}](${url})${text ? `: ${text}` : ""}`;
}

export async function GET() {
  const locale = I18N_CONFIG.defaultLocale as Locale;
  const payload = await getPayloadClient();
  const [settings, pages, posts] = await Promise.all([
    getSiteSettings({ locale }),
    getAllDocuments(payload, "page", {
      locale,
      select: { breadcrumbs: true, meta: true, slug: true, title: true },
      // Filtered and sorted below: drizzle fails on localized `meta.robots` / `title` with `select`.
      sort: "slug",
      where: { _status: { equals: "published" } },
    }),
    getAllDocuments(payload, BLOG_CONFIG.collection, {
      locale,
      select: { excerpt: true, slug: true, title: true },
      sort: "-publishedAt",
      where: { _status: { equals: "published" } },
    }),
  ]);

  const siteName = settings.general?.siteName || "Website";
  const description = settings.seo?.defaultDescription ?? "";

  const body = [
    `# ${siteName}`,
    "",
    description ? `> ${description}` : "",
    "",
    "## Pages",
    "",
    ...pages
      .filter((page) => page.meta?.robots !== "noindex")
      .toSorted((a, b) => a.title.localeCompare(b.title))
      .map((page) =>
        line(
          page.title,
          buildUrl({ breadcrumbs: page.breadcrumbs, collection: "page", locale }),
          page.meta?.description
        )
      ),
    "",
    "## Articles",
    "",
    ...posts.map((post) =>
      line(post.title, buildUrl({ collection: "posts", locale, slug: post.slug }), post.excerpt)
    ),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
