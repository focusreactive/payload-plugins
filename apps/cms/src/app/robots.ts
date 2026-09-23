import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getServerSideURL } from "@/lib/utils/getURL";

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
        // This sandbox carries a prospect's own published articles and their people, under a URL
        // that gets shared after the call. Nothing here may be indexed, so the whole tree is
        // disallowed rather than the admin and the API alone.
        disallow: "/",
        userAgent: "*",
      },
    ],
    sitemap: `${sitemapBase}/sitemap.xml`,
  };
}
