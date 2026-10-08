import path from "node:path";

import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = import.meta.dirname;

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

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
    // Next.js 16.4: drop unreachable work from Turbopack's memory + disk cache in long dev sessions.
    turbopackGc: true,
    // Next.js 16.4: compile client `import()` targets (heavy in the Payload admin) only when first requested in dev.
    turbopackLazyDynamicImports: true,
  },
  images: {
    localPatterns: [{ pathname: "**", search: "" }, { pathname: "/api/media/**" }],
    minimumCacheTTL: THIRTY_DAYS_IN_SECONDS,
    qualities: [75, 85],
    remotePatterns: [{ hostname: "*.public.blob.vercel-storage.com", protocol: "https" }],
  },
};

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl(withPayload(nextConfig, { devBundleServerPackages: false }));
