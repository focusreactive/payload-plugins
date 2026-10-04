import { getFeedPosts, getSiteSettings } from "@/dal";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { FEEDS } from "@/lib/config/feeds";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { postBodyToHtml } from "@/lib/markdown/toHtml";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Author, Category, Post } from "@/payload-types";

/**
 * RSS and Atom at the old addresses (§5.5): /feeds/all.atom.xml, /feeds/all.rss.xml and
 * /feeds/<category>.atom.xml|.rss.xml. Dotted paths bypass the locale proxy.
 */

function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(html: string): string {
  return `<![CDATA[${html.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function names(post: Post): string[] {
  return (post.authors ?? [])
    .filter((author): author is Author => typeof author === "object" && author !== null)
    .map((author) => author.name);
}

function categoryTitles(post: Post): string[] {
  return (post.categories ?? [])
    .filter((category): category is Category => typeof category === "object" && category !== null)
    .map((category) => category.title);
}

function categoryTitle(post: Post, slug: string): string {
  const match = (post.categories ?? []).find(
    (entry): entry is Category => typeof entry === "object" && entry !== null && entry.slug === slug
  );
  return match?.title ?? slug;
}

function atom(posts: Post[], meta: { title: string; self: string; site: string; link: string }) {
  const updated = posts[0]?.updatedAt ?? new Date().toISOString();
  const entries = posts
    .map((post) => {
      const link = `${meta.site}${BLOG_CONFIG.basePath}/${post.slug}`;
      return `  <entry>
    <title>${escape(post.title)}</title>
    <link href="${escape(link)}" rel="alternate"/>
    <id>${escape(link)}</id>
    <published>${new Date(post.publishedAt ?? post.createdAt).toISOString()}</published>
    <updated>${new Date(post.updatedAt).toISOString()}</updated>
${names(post)
  .map((name) => `    <author><name>${escape(name)}</name></author>`)
  .join("\n")}
${categoryTitles(post)
  .map((term) => `    <category term="${escape(term)}"/>`)
  .join("\n")}
    <summary type="text">${escape(post.excerpt ?? "")}</summary>
    <content type="html">${escape(postBodyToHtml(post))}</content>
  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escape(meta.title)}</title>
  <link href="${escape(meta.link)}" rel="alternate"/>
  <link href="${escape(meta.self)}" rel="self"/>
  <id>${escape(meta.self)}</id>
  <updated>${new Date(updated).toISOString()}</updated>
${entries}
</feed>
`;
}

function rss(posts: Post[], meta: { title: string; self: string; site: string; link: string }) {
  const items = posts
    .map((post) => {
      const link = `${meta.site}${BLOG_CONFIG.basePath}/${post.slug}`;
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="true">${escape(link)}</guid>
      <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
${names(post)
  .map((name) => `      <dc:creator>${escape(name)}</dc:creator>`)
  .join("\n")}
${categoryTitles(post)
  .map((term) => `      <category>${escape(term)}</category>`)
  .join("\n")}
      <description>${escape(post.excerpt ?? "")}</description>
      <content:encoded>${cdata(postBodyToHtml(post))}</content:encoded>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escape(meta.title)}</title>
    <link>${escape(meta.link)}</link>
    <description>${escape(meta.title)}</description>
    <atom:link href="${escape(meta.self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const match = FEEDS.categoryPattern.exec(feed);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }
  const [, name, format] = match as unknown as [string, string, "atom" | "rss"];
  const category = name === "all" ? undefined : name;

  const site = getServerSideURL();
  const settings = await getSiteSettings({ locale: I18N_CONFIG.defaultLocale as Locale });
  const siteName = settings.general?.siteName || "Blog";
  const posts = await getFeedPosts(category);
  if (category && posts.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const meta = {
    link: `${site}${BLOG_CONFIG.basePath}`,
    self: `${site}/feeds/${feed}`,
    site,
    title: category ? `${siteName} — ${categoryTitle(posts[0]!, category)}` : siteName,
  };

  return new Response(format === "atom" ? atom(posts, meta) : rss(posts, meta), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": `application/${format === "atom" ? "atom" : "rss"}+xml; charset=utf-8`,
    },
  });
}
