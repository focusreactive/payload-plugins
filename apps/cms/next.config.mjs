import path from "node:path";
import { fileURLToPath } from "node:url";

import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = import.meta.dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Your Next.js config here
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    return webpackConfig;
  },
  reactCompiler: true,
  transpilePackages: ["@yoast/search-metadata-previews", "@yoast/components"],
  experimental: {
    inlineCss: true,
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/api/media/**",
        port: "3000",
        protocol: "http",
      },
      {
        hostname: "localhost",
        pathname: "/api/media/**",
        port: "3333",
        protocol: "http",
      },
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "payload-cms-ideal-cms.com",
        protocol: "https",
      },
      {
        hostname: "payload-cms-ideal-cms.vercel.app",
        protocol: "https",
      },
      /*
       * Every product image the storefront API returns is served from this host. Without it the
       * commerce blocks have to pass `unoptimized`, which ships the original full-size asset and
       * drops the whole image pipeline on the one part of the page that is all photography.
       */
      {
        hostname: "cdn.shopify.com",
        protocol: "https",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl(withPayload(nextConfig, { devBundleServerPackages: false }));
