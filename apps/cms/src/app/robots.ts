import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getServerSideURL } from "@/lib/utils/getURL";

/** AI search and answer engines are welcome (§5.11); the private paths stay closed to them too. */
const AI_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
];
const PRIVATE_PATHS = ["/admin/", "/api/", "/next/"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getServerSideURL();
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto =
    headersList.get("x-forwarded-proto") ?? (baseUrl.startsWith("https") ? "https" : "http");
  const sitemapBase = host ? `${proto}://${host}` : baseUrl;

  return {
    rules: [
      {
        allow: "/",
        disallow: [
          ...PRIVATE_PATHS,
          ...["draft", "category", "q", "query"].flatMap((param) => [
            `/*?${param}=`,
            `/*&${param}=`,
          ]),
        ],
        userAgent: "*",
      },
      ...AI_AGENTS.map((userAgent) => ({ allow: "/", disallow: PRIVATE_PATHS, userAgent })),
    ],
    sitemap: `${sitemapBase}/sitemap.xml`,
  };
}
