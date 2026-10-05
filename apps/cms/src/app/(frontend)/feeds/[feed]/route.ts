import { getFeedEntries, getSiteSettings } from "@/dal";
import type { FeedEntry } from "@/dal";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { FEEDS } from "@/lib/config/feeds";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { getServerSideURL } from "@/lib/utils/getURL";

/**
 * RSS and Atom at the old addresses (§5.5): /feeds/atom.xml, /feeds/rss.xml and
 * /feeds/<tag>.atom.xml|.rss.xml. Dotted paths bypass the locale proxy.
 */

interface FeedMeta {
  title: string;
  self: string;
  site: string;
  link: string;
}

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

function lines(values: string[], render: (value: string) => string): string {
  return values.map(render).join("\n");
}

function atom(entries: FeedEntry[], meta: FeedMeta) {
  const updated = entries[0]?.updated ?? new Date().toISOString();
  const body = entries
    .map((entry) => {
      const link = `${meta.site}${entry.path}`;
      return `  <entry>
    <title>${escape(entry.title)}</title>
    <link href="${escape(link)}" rel="alternate"/>
    <id>${escape(link)}</id>
    <published>${new Date(entry.published).toISOString()}</published>
    <updated>${new Date(entry.updated).toISOString()}</updated>
${lines(entry.authors, (name) => `    <author><name>${escape(name)}</name></author>`)}
${lines(
  entry.tags.map((tag) => tag.title),
  (term) => `    <category term="${escape(term)}"/>`
)}
    <summary type="text">${escape(entry.summary)}</summary>
    <content type="html">${escape(entry.html)}</content>
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
${body}
</feed>
`;
}

function rss(entries: FeedEntry[], meta: FeedMeta) {
  const items = entries
    .map((entry) => {
      const link = `${meta.site}${entry.path}`;
      return `    <item>
      <title>${escape(entry.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="true">${escape(link)}</guid>
      <pubDate>${new Date(entry.published).toUTCString()}</pubDate>
${lines(entry.authors, (name) => `      <dc:creator>${escape(name)}</dc:creator>`)}
${lines(
  entry.tags.map((tag) => tag.title),
  (term) => `      <category>${escape(term)}</category>`
)}
      <description>${escape(entry.summary)}</description>
      <content:encoded>${cdata(entry.html)}</content:encoded>
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

function parseFeed(feed: string): { format: "atom" | "rss"; tag?: string } | null {
  if (feed === "atom.xml" || feed === "rss.xml") {
    return { format: feed === "atom.xml" ? "atom" : "rss" };
  }
  const match = FEEDS.tagPattern.exec(feed);
  return match ? { format: match[2] as "atom" | "rss", tag: match[1] } : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const parsed = parseFeed(decodeURIComponent(feed));
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }
  const { format, tag } = parsed;

  const site = getServerSideURL();
  const settings = await getSiteSettings({ locale: I18N_CONFIG.defaultLocale as Locale });
  const siteName = settings.general?.siteName || "Blog";
  const entries = await getFeedEntries(tag);
  if (tag && entries.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const tagTitle = tag ? entries[0]?.tags.find((entry) => entry.slug === tag)?.title : undefined;

  const meta = {
    link: `${site}${BLOG_CONFIG.basePath}`,
    self: `${site}/feeds/${feed}`,
    site,
    title: tag ? `${siteName} — ${tagTitle ?? tag}` : siteName,
  };

  return new Response(format === "atom" ? atom(entries, meta) : rss(entries, meta), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": `application/${format}+xml; charset=utf-8`,
    },
  });
}
